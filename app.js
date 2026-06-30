// Esta contraseña no es seguridad real: solo funciona como barrera interna en el frontend.
// En producción, el panel admin debería protegerse con autenticación real y políticas RLS estrictas.
const ADMIN_PASSWORD = "Prode2026";

const page = document.body.dataset.page;
const messageBox = document.getElementById("message");
let currentPredictions = [];
let closedMatchIds = new Set();
let closedMatchesLoadPromise = Promise.resolve();
let rankingDetailsByParticipant = new Map();
let currentRankingMode = "groups";

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function showMessage(text, type = "info") {
  if (!messageBox) return;
  messageBox.textContent = text;
  messageBox.className = `message ${type} ${text ? "visible" : ""}`;
}

function clearMessage() {
  showMessage("");
}

function assertSupabaseConfig() {
  if (!isSupabaseConfigured()) {
    throw new Error("Falta configurar SUPABASE_URL y SUPABASE_ANON_KEY en supabase.js.");
  }
}

function renderTeam(teamName) {
  const team = TEAMS[teamName] || { name: teamName, flag: "" };
  const flag = team.flag ? `<span class="flag" aria-hidden="true">${team.flag}</span> ` : "";
  return `<span class="team">${flag}<span>${team.name}</span></span>`;
}

function renderMatchesForm() {
  const container = document.getElementById("matchesContainer");
  if (!container) return;

  const groups = groupMatches();
  container.innerHTML = Object.entries(groups).map(([groupName, matches]) => `
    <section class="group-card">
      <h2>${groupName}</h2>
      <div class="match-list">
        ${matches.map(match => `
          <article class="match-row" data-match-id="${match.id}">
            <div class="match-number">#${match.id}</div>
            <div class="match-team left-team">${renderTeam(match.team1)}</div>
            <input class="goal-input" type="number" min="0" step="1" inputmode="numeric" aria-label="Goles ${match.team1}" data-goals="1" data-match-id="${match.id}">
            <span class="versus">vs</span>
            <input class="goal-input" type="number" min="0" step="1" inputmode="numeric" aria-label="Goles ${match.team2}" data-goals="2" data-match-id="${match.id}">
            <div class="match-team right-team">${renderTeam(match.team2)}</div>
            <span class="closed-badge hidden">Cerrado</span>
          </article>
        `).join("")}
      </div>
    </section>
  `).join("");
}

function applyClosedMatches() {
  MATCHES.forEach(match => {
    const row = document.querySelector(`.match-row[data-match-id="${match.id}"]`);
    if (!row) return;

    const isClosed = closedMatchIds.has(match.id);
    row.classList.toggle("closed-match", isClosed);
    row.querySelectorAll(".goal-input").forEach(input => {
      input.disabled = isClosed;
      if (isClosed) {
        input.value = "";
        input.classList.remove("input-error");
      }
    });

    const badge = row.querySelector(".closed-badge");
    badge?.classList.toggle("hidden", !isClosed);
  });
}

async function loadClosedMatches() {
  assertSupabaseConfig();
  const { data, error } = await supabaseClient
    .from("official_results")
    .select("match_id, is_locked")
    .eq("is_locked", true);

  if (error) throw error;
  closedMatchIds = new Set((data || []).map(result => result.match_id));
  applyClosedMatches();
}

function readPredictionsFromForm() {
  const predictions = [];
  const errors = [];

  MATCHES.forEach(match => {
    const goals1Input = document.querySelector(`input[data-match-id="${match.id}"][data-goals="1"]`);
    const goals2Input = document.querySelector(`input[data-match-id="${match.id}"][data-goals="2"]`);

    if (closedMatchIds.has(match.id)) {
      goals1Input?.classList.remove("input-error");
      goals2Input?.classList.remove("input-error");
      return;
    }

    const rawGoals1 = goals1Input?.value ?? "";
    const rawGoals2 = goals2Input?.value ?? "";

    if (rawGoals1 === "" || rawGoals2 === "") {
      errors.push(`Falta completar el partido #${match.id}.`);
      goals1Input?.classList.add("input-error");
      goals2Input?.classList.add("input-error");
      return;
    }

    const goals1 = Number(rawGoals1);
    const goals2 = Number(rawGoals2);
    if (!Number.isInteger(goals1) || !Number.isInteger(goals2) || goals1 < 0 || goals2 < 0) {
      errors.push(`El partido #${match.id} tiene goles inválidos.`);
      goals1Input?.classList.add("input-error");
      goals2Input?.classList.add("input-error");
      return;
    }

    goals1Input?.classList.remove("input-error");
    goals2Input?.classList.remove("input-error");
    predictions.push({ match_id: match.id, goals1, goals2, sign: getResultSign(goals1, goals2) });
  });

  return { predictions, errors };
}

async function participantExists(fullName) {
  const { data, error } = await supabaseClient
    .from("participants")
    .select("id")
    .ilike("full_name", fullName)
    .limit(1);

  if (error) throw error;
  return data.length > 0;
}

function renderSummary(fullName, predictions) {
  const summarySection = document.getElementById("summarySection");
  const summaryList = document.getElementById("summaryList");
  summaryList.innerHTML = `
    <div class="summary-name"><strong>Participante:</strong> ${fullName}</div>
    ${predictions.map(prediction => {
      const match = MATCHES.find(item => item.id === prediction.match_id);
      return `
        <div class="summary-item">
          <span>#${match.id} · ${match.group}</span>
          <strong>${getTeamLabel(match.team1)} ${prediction.goals1} - ${prediction.goals2} ${getTeamLabel(match.team2)}</strong>
          <small>Signo: ${prediction.sign}</small>
        </div>
      `;
    }).join("")}
  `;
  summarySection.classList.remove("hidden");
  summarySection.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function savePredictions() {
  const fullName = normalizeName(document.getElementById("fullName").value);
  const confirmButton = document.getElementById("confirmButton");
  confirmButton.disabled = true;
  showMessage("Guardando prode...", "info");

  try {
    assertSupabaseConfig();
    if (await participantExists(fullName)) {
      showMessage("Ya existe una participación registrada con ese nombre y apellido.", "error");
      return;
    }

    const { data: participant, error: participantError } = await supabaseClient
      .from("participants")
      .insert({ full_name: fullName })
      .select("id")
      .single();

    if (participantError) {
      if (participantError.code === "23505") {
        showMessage("Ya existe una participación registrada con ese nombre y apellido.", "error");
        return;
      }
      throw participantError;
    }

    const rows = currentPredictions.map(prediction => ({
      participant_id: participant.id,
      match_id: prediction.match_id,
      goals1: prediction.goals1,
      goals2: prediction.goals2
    }));

    if (rows.length > 0) {
      const { error: predictionsError } = await supabaseClient.from("predictions").insert(rows);
      if (predictionsError) throw predictionsError;
    }

    document.getElementById("predictionForm").reset();
    document.getElementById("summarySection").classList.add("hidden");
    showMessage("¡Prode registrado correctamente!", "success");
  } catch (error) {
    showMessage(error.message || "No se pudo guardar el prode.", "error");
  } finally {
    confirmButton.disabled = false;
  }
}

function initIndexPage() {
  renderMatchesForm();
  closedMatchesLoadPromise = loadClosedMatches().catch(error => {
    showMessage(error.message || "No se pudieron consultar los partidos cerrados.", "error");
  });
  const form = document.getElementById("predictionForm");
  const editButton = document.getElementById("editButton");
  const confirmButton = document.getElementById("confirmButton");

  form.addEventListener("submit", async event => {
    event.preventDefault();
    clearMessage();
    const fullNameInput = document.getElementById("fullName");
    const fullName = normalizeName(fullNameInput.value);
    fullNameInput.value = fullName;

    if (!fullName) {
      showMessage("Ingresá Nombre y Apellido para continuar.", "error");
      fullNameInput.focus();
      return;
    }

    await closedMatchesLoadPromise;

    const { predictions, errors } = readPredictionsFromForm();
    const openMatchesCount = MATCHES.length - closedMatchIds.size;
    if (errors.length > 0 || predictions.length !== openMatchesCount) {
      showMessage("No se puede guardar si falta completar algún partido abierto o hay goles inválidos.", "error");
      return;
    }

    try {
      assertSupabaseConfig();
      if (await participantExists(fullName)) {
        showMessage("Ya existe una participación registrada con ese nombre y apellido.", "error");
        return;
      }
      currentPredictions = predictions;
      renderSummary(fullName, predictions);
    } catch (error) {
      showMessage(error.message || "No se pudo validar el participante.", "error");
    }
  });

  editButton.addEventListener("click", () => {
    document.getElementById("summarySection").classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  confirmButton.addEventListener("click", savePredictions);
}

function scorePrediction(prediction, result) {
  if (!result) return { points: 0, exact: 0, sign: 0 };
  if (prediction.goals1 === result.goals1 && prediction.goals2 === result.goals2) {
    return { points: 3, exact: 1, sign: 1 };
  }
  if (getResultSign(prediction.goals1, prediction.goals2) === getResultSign(result.goals1, result.goals2)) {
    return { points: 1, exact: 0, sign: 1 };
  }
  return { points: 0, exact: 0, sign: 0 };
}


function renderPodium(ranking) {
  const podium = document.getElementById("podium");
  if (!podium) return;

  const topThree = ranking.slice(0, 3);
  if (topThree.length === 0) {
    podium.innerHTML = "";
    return;
  }

  const medals = ["🥇", "🥈", "🥉"];
  podium.innerHTML = topThree.map((participant, index) => `
    <article class="podium-card podium-${index + 1}">
      <div class="podium-medal">${medals[index]}</div>
      <div class="podium-position">${index + 1}° puesto</div>
      <h3>${participant.full_name}</h3>
      <strong>${participant.points} pts</strong>
      <div class="podium-stats">
        <span>Exactos: ${participant.exacts}</span>
        <span>${currentRankingMode === "knockout" ? "Ganadores" : "Signos"}: ${participant.signs}</span>
      </div>
      <button type="button" class="detail-button" data-participant-id="${participant.id}">Ver detalle</button>
    </article>
  `).join("");
  bindRankingDetailButtons(podium);
}

function getDetailResultClass(score) {
  if (score.points === 3) return { className: "exact", label: "Exacto +3" };
  if (score.points === 1) return { className: "sign", label: "Signo +1" };
  return { className: "miss", label: "No acertado 0" };
}

function openRankingDetail(participantId) {
  const modal = document.getElementById("rankingDetailModal");
  const title = document.getElementById("rankingDetailTitle");
  const content = document.getElementById("rankingDetailContent");
  if (!modal || !title || !content) return;

  const details = rankingDetailsByParticipant.get(participantId) || [];
  const participantName = document.querySelector(`.detail-button[data-participant-id="${participantId}"]`)?.closest("tr")?.children[1]?.textContent
    || document.querySelector(`.detail-button[data-participant-id="${participantId}"]`)?.closest(".podium-card")?.querySelector("h3")?.textContent
    || "Participante";

  title.textContent = `Detalle de ${participantName}`;

  if (details.length === 0) {
    content.innerHTML = `<p class="empty-detail">Todavía no hay partidos ${currentRankingMode === "knockout" ? "de eliminatorias cerrados" : "con resultado oficial"} para este participante.</p>`;
  } else {
    content.innerHTML = details.map(({ match, prediction, result, score, type }) => {
      const status = getDetailResultClass(score);
      const isKnockout = type === "knockout";
      const phase = isKnockout ? match.phase : match.group;
      const team1 = isKnockout ? match.resolvedTeam1 : match.team1;
      const team2 = isKnockout ? match.resolvedTeam2 : match.team2;
      const extra = isKnockout ? `<small>Clasificado pronosticado: ${getTeamLabel(prediction.predicted_winner)}</small><small>Clasificado oficial: ${getTeamLabel(result.winner_team)}</small>` : "";
      return `
        <article class="detail-item ${status.className}">
          <div>
            <strong>#${match.id} · ${phase}</strong>
            <span>${getTeamLabel(team1)} ${prediction.goals1} - ${prediction.goals2} ${getTeamLabel(team2)}</span>
            <small>Oficial: ${getTeamLabel(team1)} ${result.goals1} - ${result.goals2} ${getTeamLabel(team2)}</small>
            ${extra}
          </div>
          <strong class="detail-points">${status.label}</strong>
        </article>
      `;
    }).join("");
  }

  modal.classList.remove("hidden");
}

function closeRankingDetail() {
  document.getElementById("rankingDetailModal")?.classList.add("hidden");
}

function bindRankingDetailButtons(scope = document) {
  scope.querySelectorAll(".detail-button").forEach(button => {
    button.addEventListener("click", () => openRankingDetail(button.dataset.participantId));
  });
}

async function loadRanking(mode = currentRankingMode) {
  currentRankingMode = mode;
  const rankingBody = document.getElementById("rankingBody");
  const rankingNotice = document.getElementById("rankingNotice");
  const rankingTitle = document.getElementById("rankingTitle");
  const rankingSignHeader = document.getElementById("rankingSignHeader");
  rankingBody.innerHTML = `<tr><td colspan="7">Cargando ranking...</td></tr>`;
  rankingNotice.textContent = "";
  if (rankingTitle) rankingTitle.textContent = mode === "knockout" ? "Ranking eliminatorias" : "Ranking fase de grupos";
  if (rankingSignHeader) rankingSignHeader.textContent = mode === "knockout" ? "Ganadores acertados" : "Signos acertados";

  try {
    assertSupabaseConfig();
    const participants = await safeSelect("participants", "id, full_name, created_at");
    const allParticipants = participants || [];
    rankingDetailsByParticipant = new Map();

    let ranking;
    if (mode === "knockout") {
      const [knockoutPredictions, knockoutResults, knockoutMatches] = await Promise.all([
        safeSelect("knockout_predictions", "participant_id, match_id, goals1, goals2, predicted_winner"),
        safeSelect("knockout_results", "match_id, goals1, goals2, winner_team, loser_team, is_locked"),
        loadKnockoutMatches()
      ]);
      const officialKnockoutResults = (knockoutResults || []).filter(result => result.is_locked);
      const knockoutResultsByMatch = new Map(officialKnockoutResults.map(result => [result.match_id, result]));
      const allKnockoutPredictions = knockoutPredictions || [];
      const knockoutMatchesById = new Map((knockoutMatches || []).map(match => [match.id, match]));

      ranking = allParticipants.map(participant => {
        const stats = { ...participant, points: 0, exacts: 0, signs: 0, totalHits: 0, details: [] };
        allKnockoutPredictions
          .filter(prediction => prediction.participant_id === participant.id)
          .forEach(prediction => {
            const result = knockoutResultsByMatch.get(prediction.match_id);
            if (!result) return;
            const score = scoreKnockoutPrediction(prediction, result);
            stats.points += score.points;
            stats.exacts += score.exact;
            stats.signs += score.sign && !score.exact ? 1 : 0;
            stats.totalHits += score.sign;
            const baseMatch = knockoutMatchesById.get(prediction.match_id);
            if (baseMatch) {
              stats.details.push({ type: "knockout", match: getResolvedKnockoutMatch(baseMatch, knockoutResultsByMatch), prediction, result, score });
            }
          });
        stats.details.sort((a, b) => a.match.id - b.match.id);
        rankingDetailsByParticipant.set(participant.id, stats.details);
        return stats;
      });

      if (officialKnockoutResults.length === 0) {
        rankingNotice.textContent = "Todavía no hay resultados cerrados de eliminatorias. Todos figuran con 0 puntos.";
      }
    } else {
      const [predictions, results] = await Promise.all([
        safeSelect("predictions", "participant_id, match_id, goals1, goals2"),
        safeSelect("official_results", "match_id, goals1, goals2, is_locked")
      ]);
      const officialResults = results || [];
      const allPredictions = predictions || [];
      const resultsByMatch = new Map(officialResults.map(result => [result.match_id, result]));

      ranking = allParticipants.map(participant => {
        const stats = { ...participant, points: 0, exacts: 0, signs: 0, totalHits: 0, details: [] };
        allPredictions
          .filter(prediction => prediction.participant_id === participant.id)
          .forEach(prediction => {
            const result = resultsByMatch.get(prediction.match_id);
            const score = scorePrediction(prediction, result);
            stats.points += score.points;
            stats.exacts += score.exact;
            stats.signs += score.sign && !score.exact ? 1 : 0;
            stats.totalHits += score.sign;
            if (result) {
              const match = MATCHES.find(item => item.id === prediction.match_id);
              if (match) stats.details.push({ type: "groups", match, prediction, result, score });
            }
          });
        stats.details.sort((a, b) => a.match.group.localeCompare(b.match.group) || a.match.id - b.match.id);
        rankingDetailsByParticipant.set(participant.id, stats.details);
        return stats;
      });

      if (officialResults.length === 0) {
        rankingNotice.textContent = "Todavía no hay resultados oficiales de fase de grupos cargados. Todos figuran con 0 puntos.";
      }
    }

    ranking.sort((a, b) => b.points - a.points || b.exacts - a.exacts || b.totalHits - a.totalHits || a.full_name.localeCompare(b.full_name));
    renderPodium(ranking);

    if (ranking.length === 0) {
      rankingBody.innerHTML = `<tr><td colspan="7">Todavía no hay participantes registrados.</td></tr>`;
      return;
    }

    rankingBody.innerHTML = ranking.map((participant, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${participant.full_name}</td>
        <td><strong>${participant.points}</strong></td>
        <td>${participant.exacts}</td>
        <td>${participant.signs}</td>
        <td>${participant.totalHits}</td>
        <td><button type="button" class="detail-button" data-participant-id="${participant.id}">Ver detalle</button></td>
      </tr>
    `).join("");
    bindRankingDetailButtons(rankingBody);
  } catch (error) {
    rankingBody.innerHTML = `<tr><td colspan="7">No se pudo cargar el ranking.</td></tr>`;
    showMessage(error.message || "Error cargando ranking.", "error");
  }
}

function renderAdminMatch(match, result, isLocked) {
  return `
    <article class="admin-match ${isLocked ? "locked-result" : ""}" data-match-id="${match.id}">
      <span class="admin-group">${match.group} · #${match.id}</span>
      ${isLocked ? `<span class="closed-badge admin-closed-badge">Cerrado</span>` : ""}
      <div class="admin-teams">
        ${renderTeam(match.team1)}
        <input class="goal-input" type="number" min="0" step="1" inputmode="numeric" aria-label="Goles oficiales ${match.team1}" data-admin-goals="1" data-match-id="${match.id}" value="${result?.goals1 ?? ""}" ${isLocked ? "disabled" : ""}>
        <span class="versus">vs</span>
        <input class="goal-input" type="number" min="0" step="1" inputmode="numeric" aria-label="Goles oficiales ${match.team2}" data-admin-goals="2" data-match-id="${match.id}" value="${result?.goals2 ?? ""}" ${isLocked ? "disabled" : ""}>
        ${renderTeam(match.team2)}
      </div>
      ${isLocked ? "" : `
        <label class="lock-control">
          <input type="checkbox" data-admin-lock="true" data-match-id="${match.id}">
          Cerrar partido
        </label>
      `}
    </article>
  `;
}

function renderAdminMatches(resultsByMatch = new Map()) {
  const openContainer = document.getElementById("resultsContainer");
  const closedContainer = document.getElementById("closedResultsContainer");
  const openTab = document.getElementById("openMatchesTab");
  const closedTab = document.getElementById("closedMatchesTab");
  if (!openContainer || !closedContainer) return;

  const openMatches = [];
  const closedMatches = [];

  MATCHES.forEach(match => {
    const result = resultsByMatch.get(match.id);
    const isLocked = result?.is_locked === true;
    if (isLocked) {
      closedMatches.push({ match, result });
    } else {
      openMatches.push({ match, result });
    }
  });

  openTab.textContent = `A completar (${openMatches.length})`;
  closedTab.textContent = `Cerrados (${closedMatches.length})`;
  openContainer.innerHTML = openMatches.length
    ? openMatches.map(({ match, result }) => renderAdminMatch(match, result, false)).join("")
    : `<div class="empty-admin-state">No hay partidos a completar.</div>`;
  closedContainer.innerHTML = closedMatches.length
    ? closedMatches.map(({ match, result }) => renderAdminMatch(match, result, true)).join("")
    : `<div class="empty-admin-state">No hay partidos cerrados.</div>`;
}

async function loadAdminResults() {
  assertSupabaseConfig();
  const { data, error } = await supabaseClient.from("official_results").select("match_id, goals1, goals2, is_locked");
  if (error) throw error;
  renderAdminMatches(new Map((data || []).map(result => [result.match_id, result])));
}

function readAdminResults() {
  const rows = [];
  const openContainer = document.getElementById("resultsContainer");
  for (const match of MATCHES) {
    const input1 = openContainer?.querySelector(`input[data-match-id="${match.id}"][data-admin-goals="1"]`);
    const input2 = openContainer?.querySelector(`input[data-match-id="${match.id}"][data-admin-goals="2"]`);
    const lockInput = openContainer?.querySelector(`input[data-match-id="${match.id}"][data-admin-lock="true"]`);
    if (!input1 || !input2 || !lockInput || lockInput.disabled) continue;

    const raw1 = input1.value;
    const raw2 = input2.value;
    const isLocked = lockInput?.checked === true;

    input1.classList.remove("input-error");
    input2.classList.remove("input-error");

    if (raw1 === "" && raw2 === "" && !isLocked) continue;
    if (raw1 === "" || raw2 === "") {
      input1.classList.add("input-error");
      input2.classList.add("input-error");
      throw new Error(`Completá ambos goles del partido #${match.id} o dejá ambos vacíos.`);
    }

    const goals1 = Number(raw1);
    const goals2 = Number(raw2);
    if (!Number.isInteger(goals1) || !Number.isInteger(goals2) || goals1 < 0 || goals2 < 0) {
      input1.classList.add("input-error");
      input2.classList.add("input-error");
      throw new Error(`El partido #${match.id} tiene goles inválidos.`);
    }

    rows.push({ match_id: match.id, goals1, goals2, is_locked: isLocked, updated_at: new Date().toISOString() });
  }
  return rows;
}


// Exportación PDF de pronósticos desde el panel admin.
function showPdfExportMessage(text, type = "info") {
  const box = document.getElementById("pdfExportMessage");
  if (!box) return;
  box.textContent = text;
  box.className = `admin-message ${type} ${text ? "visible" : ""}`;
}

function normalizePdfFileName(fullName) {
  const normalizedName = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `prode-2026-${normalizedName || "participante"}.pdf`;
}

async function loadParticipantsForExport() {
  const select = document.getElementById("participantSelect");
  const exportButton = document.getElementById("exportPdfButton");
  if (!select || !exportButton) return;

  select.innerHTML = `<option value="">Cargando participantes...</option>`;
  select.disabled = true;
  exportButton.disabled = true;
  showPdfExportMessage("Cargando participantes...", "info");

  const { data, error } = await supabaseClient
    .from("participants")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  if (error) throw error;

  const participants = data || [];
  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = participants.length ? "Seleccioná un participante" : "Sin participantes";
  select.appendChild(placeholder);

  participants.forEach(participant => {
    const option = document.createElement("option");
    option.value = participant.id;
    option.textContent = participant.full_name;
    select.appendChild(option);
  });

  if (participants.length === 0) {
    showPdfExportMessage("Todavía no hay participantes registrados.", "error");
    return;
  }

  select.disabled = false;
  exportButton.disabled = false;
  showPdfExportMessage("Participantes cargados correctamente.", "success");
}

async function getParticipantPredictionsForPdf(participantId) {
  const [{ data: participant, error: participantError }, { data: predictions, error: predictionsError }, { data: matches, error: matchesError }] = await Promise.all([
    supabaseClient.from("participants").select("id, full_name").eq("id", participantId).single(),
    supabaseClient.from("predictions").select("match_id, goals1, goals2").eq("participant_id", participantId),
    supabaseClient.from("matches").select("id, group_name, team1, team2")
  ]);

  if (participantError) throw participantError;
  if (predictionsError) throw predictionsError;
  if (matchesError) throw matchesError;

  const matchesById = new Map((matches || []).map(match => [match.id, match]));
  const rows = (predictions || [])
    .map(prediction => ({ ...prediction, match: matchesById.get(prediction.match_id) }))
    .filter(row => row.match)
    .sort((a, b) => a.match.group_name.localeCompare(b.match.group_name) || a.match.id - b.match.id);

  return { participant, rows };
}

function generatePredictionsPdf(participant, rows) {
  const jsPdfConstructor = window.jspdf?.jsPDF;
  if (!jsPdfConstructor) {
    throw new Error("No se pudo cargar jsPDF para generar el PDF.");
  }

  const doc = new jsPdfConstructor({ orientation: "landscape", unit: "mm", format: "a4" });
  if (typeof doc.autoTable !== "function") {
    throw new Error("No se pudo cargar jsPDF autoTable para generar la tabla del PDF.");
  }

  const exportedAt = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  const tableBody = rows.map(row => [
    row.match.group_name,
    `#${row.match.id}`,
    row.match.team1,
    row.goals1,
    row.goals2,
    row.match.team2,
    getResultSign(row.goals1, row.goals2)
  ]);

  doc.setFontSize(20);
  doc.text("Prode 2026", 14, 18);
  doc.setFontSize(13);
  doc.text("Pronósticos registrados", 14, 26);
  doc.setFontSize(10);
  doc.text(`Participante: ${participant.full_name}`, 14, 34);
  doc.text(`Fecha de exportación: ${exportedAt}`, 14, 40);

  doc.autoTable({
    startY: 48,
    head: [["Grupo", "Partido", "Equipo 1", "Goles 1", "Goles 2", "Equipo 2", "Signo"]],
    body: tableBody,
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [18, 70, 160], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 251, 255] },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 18 },
      2: { cellWidth: 62 },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 20, halign: "center" },
      5: { cellWidth: 62 },
      6: { cellWidth: 18, halign: "center" }
    },
    margin: { left: 14, right: 14 }
  });

  doc.save(normalizePdfFileName(participant.full_name));
}

async function exportSelectedParticipantPdf() {
  const select = document.getElementById("participantSelect");
  const exportButton = document.getElementById("exportPdfButton");
  const participantId = select?.value;

  if (!participantId) {
    showPdfExportMessage("Seleccioná un participante para exportar.", "error");
    return;
  }

  exportButton.disabled = true;
  showPdfExportMessage("Generando PDF...", "info");

  try {
    assertSupabaseConfig();
    const { participant, rows } = await getParticipantPredictionsForPdf(participantId);
    if (rows.length === 0) {
      showPdfExportMessage("Este participante no tiene pronósticos registrados.", "error");
      return;
    }

    generatePredictionsPdf(participant, rows);
    showPdfExportMessage("PDF exportado correctamente.", "success");
  } catch (error) {
    showPdfExportMessage(error.message || "No se pudo exportar el PDF.", "error");
  } finally {
    exportButton.disabled = false;
  }
}


function switchAdminTab(tabName) {
  const isClosedTab = tabName === "closed";
  document.getElementById("openMatchesPanel")?.classList.toggle("hidden", isClosedTab);
  document.getElementById("closedMatchesPanel")?.classList.toggle("hidden", !isClosedTab);
  document.querySelectorAll("[data-admin-tab]").forEach(tab => {
    const isActive = tab.dataset.adminTab === tabName;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
}

function initAdminPage() {
  renderAdminMatches();
  const loginButton = document.getElementById("loginButton");
  const passwordInput = document.getElementById("adminPassword");
  const resultsForm = document.getElementById("resultsForm");
  const exportPdfButton = document.getElementById("exportPdfButton");
  const adminTabs = document.querySelectorAll(".admin-tab");
  const moduleTabs = document.querySelectorAll("[data-admin-module]");
  const knockoutResultsForm = document.getElementById("knockoutResultsForm");
  const refreshPinsButton = document.getElementById("refreshPinsButton");
  const knockoutAdminContainer = document.getElementById("knockoutAdminContainer");

  loginButton.addEventListener("click", async () => {
    if (passwordInput.value !== ADMIN_PASSWORD) {
      showMessage("Contraseña incorrecta.", "error");
      return;
    }

    document.getElementById("loginPanel").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
    showMessage("Acceso habilitado.", "success");
    try {
      await loadAdminResults();
    } catch (error) {
      showMessage(error.message || "No se pudieron cargar los resultados.", "error");
    }

    try {
      await loadParticipantsForExport();
      await loadPinsAdmin();
      await loadKnockoutAdminResults();
    } catch (error) {
      showPdfExportMessage(error.message || "No se pudieron cargar los participantes.", "error");
    }
  });

  exportPdfButton.addEventListener("click", exportSelectedParticipantPdf);
  adminTabs.forEach(tab => {
    if (tab.dataset.adminTab) tab.addEventListener("click", () => switchAdminTab(tab.dataset.adminTab));
  });
  moduleTabs.forEach(tab => tab.addEventListener("click", () => switchAdminModule(tab.dataset.adminModule)));
  refreshPinsButton?.addEventListener("click", loadPinsAdmin);
  knockoutAdminContainer?.addEventListener("input", event => {
    if (event.target.matches('[data-ko-admin-goals="1"], [data-ko-admin-goals="2"]')) updateKnockoutAdminWinnerSelectors(event.target.closest(".knockout-admin-match"));
  });
  knockoutAdminContainer?.addEventListener("click", event => {
    const startButton = event.target.closest("[data-start-ko-match]");
    if (startButton && !startButton.disabled) markKnockoutMatchStarted(startButton.dataset.startKoMatch);
  });
  knockoutResultsForm?.addEventListener("submit", saveKnockoutAdminResults);

  resultsForm.addEventListener("submit", async event => {
    event.preventDefault();
    try {
      assertSupabaseConfig();
      const rows = readAdminResults();
      if (rows.length === 0) {
        showMessage("No hay resultados para guardar.", "error");
        return;
      }
      const { error } = await supabaseClient.from("official_results").upsert(rows, { onConflict: "match_id" });
      if (error) throw error;
      await loadAdminResults();
      showMessage("Resultados guardados correctamente.", "success");
    } catch (error) {
      showMessage(error.message || "No se pudieron guardar los resultados.", "error");
    }
  });
}
let knockoutParticipant = null;
let knockoutResultsCache = new Map();
let knockoutStatusCache = new Map();
let knockoutMatchesCache = [];

function normalizePin(pin) {
  return String(pin || "").trim();
}

function generatePinCode() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

function getKnockoutSourceLabel(type, matchId) {
  if (!type || !matchId) return "Pendiente de definición";
  return `${type === "loser" ? "Perdedor" : "Ganador"} Partido ${matchId}`;
}

function resolveKnockoutTeam(match, side, resultsByMatch = knockoutResultsCache) {
  const directTeam = match[`team${side}`];
  if (directTeam) return { name: directTeam, pending: false, label: getTeamLabel(directTeam) };

  const sourceType = match[`source${side}Type`];
  const sourceMatchId = match[`source${side}MatchId`];
  const sourceResult = resultsByMatch.get(sourceMatchId);
  if (sourceResult?.is_locked) {
    const name = sourceType === "loser" ? sourceResult.loser_team : sourceResult.winner_team;
    return { name, pending: false, label: getTeamLabel(name) };
  }
  return { name: "", pending: true, label: "Pendiente de definición", sourceLabel: getKnockoutSourceLabel(sourceType, sourceMatchId) };
}

function getResolvedKnockoutMatch(match, resultsByMatch = knockoutResultsCache) {
  const side1 = resolveKnockoutTeam(match, 1, resultsByMatch);
  const side2 = resolveKnockoutTeam(match, 2, resultsByMatch);
  return { ...match, resolvedTeam1: side1.name, resolvedTeam2: side2.name, team1Pending: side1.pending, team2Pending: side2.pending, team1Label: side1.label, team2Label: side2.label, source1Label: side1.sourceLabel, source2Label: side2.sourceLabel, isAvailable: !side1.pending && !side2.pending };
}

function getKnockoutWinner(goals1, goals2, team1, team2, selectedWinner = "") {
  if (goals1 > goals2) return team1;
  if (goals2 > goals1) return team2;
  return selectedWinner;
}

function scoreKnockoutPrediction(prediction, result) {
  if (!result) return { points: 0, exact: 0, sign: 0 };
  if (prediction.goals1 === result.goals1 && prediction.goals2 === result.goals2 && prediction.predicted_winner === result.winner_team) {
    return { points: 3, exact: 1, sign: 1 };
  }
  if (prediction.predicted_winner === result.winner_team) {
    return { points: 1, exact: 0, sign: 1 };
  }
  return { points: 0, exact: 0, sign: 0 };
}

async function safeSelect(table, columns) {
  const { data, error } = await supabaseClient.from(table).select(columns);
  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message || "")) return [];
    throw error;
  }
  return data || [];
}

async function loadKnockoutResultsMap() {
  const rows = await safeSelect("knockout_results", "match_id, goals1, goals2, winner_team, loser_team, is_locked");
  knockoutResultsCache = new Map(rows.map(result => [result.match_id, result]));
  return knockoutResultsCache;
}

async function loadKnockoutStatusMap() {
  const rows = await safeSelect("knockout_match_status", "match_id, is_started");
  knockoutStatusCache = new Map(rows.map(status => [status.match_id, status]));
  return knockoutStatusCache;
}

function isKnockoutStarted(matchId, statusByMatch = knockoutStatusCache) {
  return statusByMatch.get(matchId)?.is_started === true;
}

function normalizeKnockoutMatch(row) {
  return {
    id: row.id,
    phase: row.phase,
    team1: row.team1,
    team2: row.team2,
    source1Type: row.source1_type,
    source1MatchId: row.source1_match_id,
    source2Type: row.source2_type,
    source2MatchId: row.source2_match_id,
    sortOrder: row.sort_order
  };
}

async function loadKnockoutMatches() {
  const rows = await safeSelect("knockout_matches", "id, phase, team1, team2, source1_type, source1_match_id, source2_type, source2_match_id, sort_order");
  knockoutMatchesCache = (rows || [])
    .map(normalizeKnockoutMatch)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  return knockoutMatchesCache;
}

async function authenticateKnockoutParticipant() {
  const fullNameInput = document.getElementById("knockoutFullName");
  const pinInput = document.getElementById("knockoutPin");
  const fullName = normalizeName(fullNameInput.value);
  const pin = normalizePin(pinInput.value);
  fullNameInput.value = fullName;

  if (!fullName || !/^\d{4}$/.test(pin)) {
    showMessage("Ingresá Nombre y Apellido y un PIN de 4 dígitos.", "error");
    return;
  }

  try {
    assertSupabaseConfig();
    const { data, error } = await supabaseClient
      .from("participants")
      .select("id, full_name, pin_code")
      .ilike("full_name", fullName)
      .eq("pin_code", pin)
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) {
      showMessage("Nombre/PIN incorrecto.", "error");
      return;
    }
    knockoutParticipant = data[0];
    document.getElementById("knockoutParticipantName").textContent = `Eliminatorias de ${knockoutParticipant.full_name}`;
    document.getElementById("knockoutLogin").classList.add("hidden");
    document.getElementById("knockoutPanel").classList.remove("hidden");
    await loadKnockoutPageData();
    showMessage("Acceso habilitado.", "success");
  } catch (error) {
    showMessage(error.message || "No se pudo validar el participante.", "error");
  }
}

async function loadKnockoutPageData() {
  assertSupabaseConfig();
  const [matches, resultsByMatch, statusByMatch, predictions] = await Promise.all([
    loadKnockoutMatches(),
    loadKnockoutResultsMap(),
    loadKnockoutStatusMap(),
    safeSelect("knockout_predictions", "match_id, goals1, goals2, predicted_winner, participant_id")
  ]);
  const participantPredictions = new Map(predictions.filter(prediction => prediction.participant_id === knockoutParticipant.id).map(prediction => [prediction.match_id, prediction]));
  renderKnockoutForm(matches, resultsByMatch, participantPredictions, statusByMatch);
}

function renderKnockoutForm(matches, resultsByMatch, predictionsByMatch = new Map(), statusByMatch = knockoutStatusCache) {
  const container = document.getElementById("knockoutMatchesContainer");
  if (!container) return;
  const groups = groupKnockoutMatches(matches);
  container.innerHTML = Object.entries(groups).map(([phase, matches]) => `
    <section class="group-card knockout-phase-card">
      <h2>${phase}</h2>
      <div class="match-list">
        ${matches.map(match => renderKnockoutPredictionRow(getResolvedKnockoutMatch(match, resultsByMatch), predictionsByMatch.get(match.id), resultsByMatch.get(match.id), statusByMatch.get(match.id))).join("")}
      </div>
    </section>
  `).join("");
}

function renderKnockoutPredictionRow(match, prediction, result, status) {
  const isLocked = result?.is_locked === true;
  const isStarted = status?.is_started === true;
  const disabled = !match.isAvailable || isLocked || isStarted;
  const pendingText = !match.isAvailable ? `<small class="pending-note">${match.source1Label || ""} ${match.source2Label || ""}</small>` : "";
  const winnerOptions = match.isAvailable ? [match.resolvedTeam1, match.resolvedTeam2].map(team => `<option value="${team}" ${prediction?.predicted_winner === team ? "selected" : ""}>${getTeamLabel(team)}</option>`).join("") : "";
  const needsWinner = prediction && prediction.goals1 === prediction.goals2;
  return `
    <article class="match-row knockout-row ${disabled ? "closed-match" : ""}" data-knockout-match-id="${match.id}" data-team1="${match.resolvedTeam1}" data-team2="${match.resolvedTeam2}">
      <div class="match-number">#${match.id}</div>
      <div class="match-team left-team"><span class="team"><span>${match.isAvailable ? getTeamLabel(match.resolvedTeam1) : "Pendiente de definición"}</span></span>${pendingText}</div>
      <input class="goal-input" type="number" min="0" step="1" inputmode="numeric" aria-label="Goles ${match.resolvedTeam1 || "equipo 1"}" data-ko-goals="1" data-match-id="${match.id}" value="${prediction?.goals1 ?? ""}" ${disabled ? "disabled" : ""}>
      <span class="versus">vs</span>
      <input class="goal-input" type="number" min="0" step="1" inputmode="numeric" aria-label="Goles ${match.resolvedTeam2 || "equipo 2"}" data-ko-goals="2" data-match-id="${match.id}" value="${prediction?.goals2 ?? ""}" ${disabled ? "disabled" : ""}>
      <div class="match-team right-team"><span class="team"><span>${match.isAvailable ? getTeamLabel(match.resolvedTeam2) : "Pendiente de definición"}</span></span></div>
      <label class="winner-select ${needsWinner ? "" : "hidden"}">Equipo que avanza
        <select data-ko-winner="true" data-match-id="${match.id}" ${disabled ? "disabled" : ""}>
          <option value="">Seleccionar</option>
          ${winnerOptions}
        </select>
      </label>
      ${isLocked ? `<span class="closed-badge">Cerrado</span>` : isStarted ? `<span class="closed-badge started-badge">Pronóstico cerrado</span>` : ""}
    </article>
  `;
}

function updateKnockoutWinnerSelectors(scope = document) {
  scope.querySelectorAll(".knockout-row").forEach(row => {
    const goals1 = row.querySelector('[data-ko-goals="1"]')?.value;
    const goals2 = row.querySelector('[data-ko-goals="2"]')?.value;
    row.querySelector(".winner-select")?.classList.toggle("hidden", goals1 === "" || goals2 === "" || goals1 !== goals2);
  });
}

function readKnockoutPredictions() {
  const rows = [];
  const errors = [];
  document.querySelectorAll(".knockout-row").forEach(row => {
    const matchId = Number(row.dataset.knockoutMatchId);
    const input1 = row.querySelector('[data-ko-goals="1"]');
    const input2 = row.querySelector('[data-ko-goals="2"]');
    if (!input1 || !input2 || input1.disabled || input2.disabled) return;
    input1.classList.remove("input-error");
    input2.classList.remove("input-error");
    const raw1 = input1.value;
    const raw2 = input2.value;
    if (raw1 === "" || raw2 === "") {
      errors.push(`Falta completar el partido #${matchId}.`);
      input1.classList.add("input-error");
      input2.classList.add("input-error");
      return;
    }
    const goals1 = Number(raw1);
    const goals2 = Number(raw2);
    if (!Number.isInteger(goals1) || !Number.isInteger(goals2) || goals1 < 0 || goals2 < 0) {
      errors.push(`El partido #${matchId} tiene goles inválidos.`);
      input1.classList.add("input-error");
      input2.classList.add("input-error");
      return;
    }
    const team1 = row.dataset.team1;
    const team2 = row.dataset.team2;
    const winnerSelect = row.querySelector('[data-ko-winner="true"]');
    const predictedWinner = getKnockoutWinner(goals1, goals2, team1, team2, winnerSelect?.value || "");
    if (!predictedWinner) {
      errors.push(`Seleccioná el equipo que avanza en el partido #${matchId}.`);
      winnerSelect?.classList.add("input-error");
      return;
    }
    winnerSelect?.classList.remove("input-error");
    rows.push({ participant_id: knockoutParticipant.id, match_id: matchId, goals1, goals2, predicted_winner: predictedWinner });
  });
  return { rows, errors };
}

async function saveKnockoutPredictions(event) {
  event.preventDefault();
  const { rows, errors } = readKnockoutPredictions();
  const availableRows = [...document.querySelectorAll(".knockout-row")].filter(row => !row.querySelector('[data-ko-goals="1"]')?.disabled);
  if (errors.length > 0 || rows.length !== availableRows.length) {
    showMessage("No se puede guardar si falta completar algún partido disponible o hay goles inválidos.", "error");
    return;
  }
  try {
    assertSupabaseConfig();
    if (rows.length === 0) {
      showMessage("No hay partidos disponibles para guardar.", "error");
      return;
    }
    const { error } = await supabaseClient.from("knockout_predictions").upsert(rows, { onConflict: "participant_id,match_id" });
    if (error) throw error;
    await loadKnockoutPageData();
    showMessage("Pronósticos de eliminatorias guardados correctamente.", "success");
  } catch (error) {
    showMessage(error.message || "No se pudieron guardar las eliminatorias.", "error");
  }
}

function initKnockoutPage() {
  document.getElementById("knockoutLoginButton")?.addEventListener("click", authenticateKnockoutParticipant);
  document.getElementById("refreshKnockout")?.addEventListener("click", loadKnockoutPageData);
  document.getElementById("knockoutForm")?.addEventListener("input", event => {
    if (event.target.matches('[data-ko-goals="1"], [data-ko-goals="2"]')) updateKnockoutWinnerSelectors(event.target.closest(".knockout-row"));
  });
  document.getElementById("knockoutForm")?.addEventListener("submit", saveKnockoutPredictions);
}
function switchAdminModule(moduleName) {
  document.querySelectorAll(".admin-module-panel").forEach(panel => panel.classList.add("hidden"));
  const panelIds = { groups: "groupResultsModule", knockout: "knockoutResultsModule", pins: "pinsModule" };
  document.getElementById(panelIds[moduleName])?.classList.remove("hidden");
  document.querySelectorAll("[data-admin-module]").forEach(tab => {
    const active = tab.dataset.adminModule === moduleName;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
}

async function loadPinsAdmin() {
  const container = document.getElementById("pinsContainer");
  if (!container) return;
  container.innerHTML = `<div class="empty-admin-state">Cargando participantes...</div>`;
  const { data, error } = await supabaseClient.from("participants").select("id, full_name, pin_code").order("full_name", { ascending: true });
  if (error) throw error;
  const participants = data || [];
  if (participants.length === 0) {
    container.innerHTML = `<div class="empty-admin-state">Todavía no hay participantes registrados.</div>`;
    return;
  }
  container.innerHTML = participants.map(participant => `
    <article class="pin-card" data-participant-id="${participant.id}">
      <div>
        <strong>${participant.full_name}</strong>
        <span>PIN: <b>${participant.pin_code || "Sin PIN"}</b></span>
      </div>
      <button type="button" class="secondary-button" data-generate-pin="${participant.id}">${participant.pin_code ? "Regenerar PIN" : "Generar PIN"}</button>
    </article>
  `).join("");
  container.querySelectorAll("[data-generate-pin]").forEach(button => {
    button.addEventListener("click", () => generateParticipantPin(button.dataset.generatePin));
  });
}

async function generateParticipantPin(participantId) {
  try {
    assertSupabaseConfig();
    const pinCode = generatePinCode();
    const { error } = await supabaseClient.from("participants").update({ pin_code: pinCode }).eq("id", participantId);
    if (error) throw error;
    await loadPinsAdmin();
    showMessage("PIN generado correctamente.", "success");
  } catch (error) {
    showMessage(error.message || "No se pudo generar el PIN.", "error");
  }
}

function renderKnockoutAdminMatch(match, result, status) {
  const resolved = getResolvedKnockoutMatch(match, knockoutResultsCache);
  const isLocked = result?.is_locked === true;
  const isStarted = status?.is_started === true;
  const disabled = isLocked || !resolved.isAvailable;
  const winnerOptions = resolved.isAvailable ? [resolved.resolvedTeam1, resolved.resolvedTeam2].map(team => `<option value="${team}" ${result?.winner_team === team ? "selected" : ""}>${getTeamLabel(team)}</option>`).join("") : "";
  return `
    <article class="admin-match knockout-admin-match ${isLocked ? "locked-result" : ""}" data-ko-admin-match-id="${match.id}" data-team1="${resolved.resolvedTeam1}" data-team2="${resolved.resolvedTeam2}">
      <span class="admin-group">${match.phase} · #${match.id}</span>
      ${isLocked ? `<span class="closed-badge admin-closed-badge">Cerrado</span>` : isStarted ? `<span class="closed-badge admin-closed-badge started-badge">Iniciado</span>` : ""}
      <div class="admin-teams">
        <span class="team"><span>${resolved.isAvailable ? getTeamLabel(resolved.resolvedTeam1) : "Pendiente de definición"}</span></span>
        <input class="goal-input" type="number" min="0" step="1" inputmode="numeric" data-ko-admin-goals="1" data-match-id="${match.id}" value="${result?.goals1 ?? ""}" ${disabled ? "disabled" : ""}>
        <span class="versus">vs</span>
        <input class="goal-input" type="number" min="0" step="1" inputmode="numeric" data-ko-admin-goals="2" data-match-id="${match.id}" value="${result?.goals2 ?? ""}" ${disabled ? "disabled" : ""}>
        <span class="team"><span>${resolved.isAvailable ? getTeamLabel(resolved.resolvedTeam2) : "Pendiente de definición"}</span></span>
      </div>
      ${resolved.isAvailable ? `
        <label class="winner-select ${result && result.goals1 === result.goals2 ? "" : "hidden"}">Equipo que avanza
          <select data-ko-admin-winner="true" data-match-id="${match.id}" aria-label="Equipo que avanza en partido ${match.id}" ${disabled ? "disabled" : ""}>
            <option value="">Seleccionar</option>
            ${winnerOptions}
          </select>
        </label>
        ${isLocked ? "" : `<div class="admin-inline-actions"><button type="button" class="secondary-button" data-start-ko-match="${match.id}" ${isStarted ? "disabled" : ""}>${isStarted ? "Partido iniciado" : "Marcar como iniciado"}</button><label class="lock-control"><input type="checkbox" data-ko-admin-lock="true" data-match-id="${match.id}"> Cerrar partido</label></div>`}
      ` : `<p class="pending-note">${resolved.source1Label || ""} ${resolved.source2Label || ""}</p>`}
    </article>
  `;
}

async function loadKnockoutAdminResults() {
  const container = document.getElementById("knockoutAdminContainer");
  if (!container) return;
  container.innerHTML = `<div class="empty-admin-state">Cargando eliminatorias...</div>`;
  const [matches, resultsByMatch, statusByMatch] = await Promise.all([loadKnockoutMatches(), loadKnockoutResultsMap(), loadKnockoutStatusMap()]);
  const groups = groupKnockoutMatches(matches);
  container.innerHTML = Object.entries(groups).map(([phase, matches]) => `
    <section class="group-card knockout-phase-card">
      <h2>${phase}</h2>
      <div class="match-list">
        ${matches.map(match => renderKnockoutAdminMatch(match, resultsByMatch.get(match.id), statusByMatch.get(match.id))).join("")}
      </div>
    </section>
  `).join("");
}

async function markKnockoutMatchStarted(matchId) {
  try {
    assertSupabaseConfig();
    const { error } = await supabaseClient
      .from("knockout_match_status")
      .upsert({ match_id: Number(matchId), is_started: true, updated_at: new Date().toISOString() }, { onConflict: "match_id" });
    if (error) throw error;
    await loadKnockoutAdminResults();
    showMessage("Partido marcado como iniciado. Los pronósticos quedaron cerrados.", "success");
  } catch (error) {
    showMessage(error.message || "No se pudo marcar el partido como iniciado.", "error");
  }
}

function updateKnockoutAdminWinnerSelectors(scope = document) {
  scope.querySelectorAll(".knockout-admin-match").forEach(row => {
    const rawGoals1 = row.querySelector('[data-ko-admin-goals="1"]')?.value;
    const rawGoals2 = row.querySelector('[data-ko-admin-goals="2"]')?.value;
    const goals1 = Number(rawGoals1);
    const goals2 = Number(rawGoals2);
    const shouldShowWinner = rawGoals1 !== "" && rawGoals2 !== "" && Number.isInteger(goals1) && Number.isInteger(goals2) && goals1 === goals2;
    row.querySelector(".winner-select")?.classList.toggle("hidden", !shouldShowWinner);
  });
}

function readKnockoutAdminResults() {
  const rows = [];
  document.querySelectorAll(".knockout-admin-match").forEach(row => {
    const matchId = Number(row.dataset.koAdminMatchId);
    const input1 = row.querySelector('[data-ko-admin-goals="1"]');
    const input2 = row.querySelector('[data-ko-admin-goals="2"]');
    const lockInput = row.querySelector('[data-ko-admin-lock="true"]');
    if (!input1 || !input2 || input1.disabled || input2.disabled || !lockInput) return;
    const raw1 = input1.value;
    const raw2 = input2.value;
    input1.classList.remove("input-error");
    input2.classList.remove("input-error");
    if (raw1 === "" && raw2 === "" && !lockInput.checked) return;
    if (raw1 === "" || raw2 === "") {
      input1.classList.add("input-error");
      input2.classList.add("input-error");
      throw new Error(`Completá ambos goles del partido #${matchId} o dejá ambos vacíos.`);
    }
    const goals1 = Number(raw1);
    const goals2 = Number(raw2);
    if (!Number.isInteger(goals1) || !Number.isInteger(goals2) || goals1 < 0 || goals2 < 0) throw new Error(`El partido #${matchId} tiene goles inválidos.`);
    const team1 = row.dataset.team1;
    const team2 = row.dataset.team2;
    const winnerSelect = row.querySelector('[data-ko-admin-winner="true"]');
    winnerSelect?.classList.remove("input-error");

    let winner;
    if (goals1 === goals2) {
      row.querySelector(".winner-select")?.classList.remove("hidden");
      winner = winnerSelect?.value || "";
      if (!winner) {
        winnerSelect?.classList.add("input-error");
        throw new Error(`Seleccioná quién avanza en el partido #${matchId}.`);
      }
    } else {
      winner = goals1 > goals2 ? team1 : team2;
    }

    const loser = winner === team1 ? team2 : team1;
    rows.push({ match_id: matchId, goals1, goals2, winner_team: winner, loser_team: loser, is_locked: lockInput.checked, updated_at: new Date().toISOString() });
  });
  return rows;
}

async function saveKnockoutAdminResults(event) {
  event.preventDefault();
  try {
    assertSupabaseConfig();
    const rows = readKnockoutAdminResults();
    if (rows.length === 0) {
      showMessage("No hay resultados de eliminatorias para guardar.", "error");
      return;
    }
    const { error } = await supabaseClient.from("knockout_results").upsert(rows, { onConflict: "match_id" });
    if (error) throw error;
    await loadKnockoutAdminResults();
    showMessage("Resultados de eliminatorias guardados correctamente.", "success");
  } catch (error) {
    showMessage(error.message || "No se pudieron guardar las eliminatorias.", "error");
  }
}

if (page === "index") initIndexPage();
if (page === "knockout") initKnockoutPage();
if (page === "ranking") {
  document.getElementById("refreshRanking").addEventListener("click", () => loadRanking(currentRankingMode));
  document.querySelectorAll("[data-ranking-mode]").forEach(tab => {
    tab.addEventListener("click", () => {
      currentRankingMode = tab.dataset.rankingMode;
      document.querySelectorAll("[data-ranking-mode]").forEach(item => {
        const active = item.dataset.rankingMode === currentRankingMode;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });
      closeRankingDetail();
      loadRanking(currentRankingMode);
    });
  });
  document.getElementById("closeDetailButton")?.addEventListener("click", closeRankingDetail);
  document.getElementById("rankingDetailModal")?.addEventListener("click", event => {
    if (event.target.id === "rankingDetailModal") closeRankingDetail();
  });
  loadRanking("groups");
}
if (page === "admin") initAdminPage();
