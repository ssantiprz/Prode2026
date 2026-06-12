// Esta contraseña no es seguridad real: solo funciona como barrera interna en el frontend.
// En producción, el panel admin debería protegerse con autenticación real y políticas RLS estrictas.
const ADMIN_PASSWORD = "CAMBIAR_PASSWORD_ADMIN";

const page = document.body.dataset.page;
const messageBox = document.getElementById("message");
let currentPredictions = [];
let closedMatchIds = new Set();
let closedMatchesLoadPromise = Promise.resolve();

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
    .select("match_id");

  if (error) throw error;
  closedMatchIds = new Set(data.map(result => result.match_id));
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

async function loadRanking() {
  const rankingBody = document.getElementById("rankingBody");
  const rankingNotice = document.getElementById("rankingNotice");
  rankingBody.innerHTML = `<tr><td colspan="6">Cargando ranking...</td></tr>`;
  rankingNotice.textContent = "";

  try {
    assertSupabaseConfig();
    const [{ data: participants, error: participantsError }, { data: predictions, error: predictionsError }, { data: results, error: resultsError }] = await Promise.all([
      supabaseClient.from("participants").select("id, full_name, created_at"),
      supabaseClient.from("predictions").select("participant_id, match_id, goals1, goals2"),
      supabaseClient.from("official_results").select("match_id, goals1, goals2")
    ]);

    if (participantsError) throw participantsError;
    if (predictionsError) throw predictionsError;
    if (resultsError) throw resultsError;

    const resultsByMatch = new Map(results.map(result => [result.match_id, result]));
    const ranking = participants.map(participant => {
      const participantPredictions = predictions.filter(prediction => prediction.participant_id === participant.id);
      return participantPredictions.reduce((stats, prediction) => {
        const score = scorePrediction(prediction, resultsByMatch.get(prediction.match_id));
        stats.points += score.points;
        stats.exacts += score.exact;
        stats.signs += score.sign && !score.exact ? 1 : 0;
        stats.totalHits += score.sign;
        return stats;
      }, { ...participant, points: 0, exacts: 0, signs: 0, totalHits: 0 });
    }).sort((a, b) => b.points - a.points || b.exacts - a.exacts || b.totalHits - a.totalHits || a.full_name.localeCompare(b.full_name));

    if (results.length === 0) {
      rankingNotice.textContent = "Todavía no hay resultados oficiales cargados. Todos figuran con 0 puntos.";
    }

    if (ranking.length === 0) {
      rankingBody.innerHTML = `<tr><td colspan="6">Todavía no hay participantes registrados.</td></tr>`;
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
      </tr>
    `).join("");
  } catch (error) {
    rankingBody.innerHTML = `<tr><td colspan="6">No se pudo cargar el ranking.</td></tr>`;
    showMessage(error.message || "Error cargando ranking.", "error");
  }
}

function renderAdminMatches(resultsByMatch = new Map()) {
  const container = document.getElementById("resultsContainer");
  container.innerHTML = MATCHES.map(match => {
    const result = resultsByMatch.get(match.id);
    return `
      <article class="admin-match" data-match-id="${match.id}">
        <span class="admin-group">${match.group} · #${match.id}</span>
        <div class="admin-teams">
          ${renderTeam(match.team1)}
          <input class="goal-input" type="number" min="0" step="1" inputmode="numeric" aria-label="Goles oficiales ${match.team1}" data-admin-goals="1" data-match-id="${match.id}" value="${result?.goals1 ?? ""}">
          <span class="versus">vs</span>
          <input class="goal-input" type="number" min="0" step="1" inputmode="numeric" aria-label="Goles oficiales ${match.team2}" data-admin-goals="2" data-match-id="${match.id}" value="${result?.goals2 ?? ""}">
          ${renderTeam(match.team2)}
        </div>
      </article>
    `;
  }).join("");
}

async function loadAdminResults() {
  assertSupabaseConfig();
  const { data, error } = await supabaseClient.from("official_results").select("match_id, goals1, goals2");
  if (error) throw error;
  renderAdminMatches(new Map(data.map(result => [result.match_id, result])));
}

function readAdminResults() {
  const rows = [];
  for (const match of MATCHES) {
    const input1 = document.querySelector(`input[data-match-id="${match.id}"][data-admin-goals="1"]`);
    const input2 = document.querySelector(`input[data-match-id="${match.id}"][data-admin-goals="2"]`);
    const raw1 = input1.value;
    const raw2 = input2.value;

    input1.classList.remove("input-error");
    input2.classList.remove("input-error");

    if (raw1 === "" && raw2 === "") continue;
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

    rows.push({ match_id: match.id, goals1, goals2, updated_at: new Date().toISOString() });
  }
  return rows;
}

function initAdminPage() {
  renderAdminMatches();
  const loginButton = document.getElementById("loginButton");
  const passwordInput = document.getElementById("adminPassword");
  const resultsForm = document.getElementById("resultsForm");

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
  });

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
      showMessage("Resultados guardados correctamente.", "success");
    } catch (error) {
      showMessage(error.message || "No se pudieron guardar los resultados.", "error");
    }
  });
}

if (page === "index") initIndexPage();
if (page === "ranking") {
  document.getElementById("refreshRanking").addEventListener("click", loadRanking);
  loadRanking();
}
if (page === "admin") initAdminPage();
