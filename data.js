const TEAMS = {
  "México": { name: "México", flag: "🇲🇽" },
  "Sudáfrica": { name: "Sudáfrica", flag: "🇿🇦" },
  "Corea del Sur": { name: "Corea del Sur", flag: "🇰🇷" },
  "República Checa": { name: "República Checa", flag: "🇨🇿" },
  "Canadá": { name: "Canadá", flag: "🇨🇦" },
  "Bosnia y Herzegovina": { name: "Bosnia y Herzegovina", flag: "🇧🇦" },
  "Estados Unidos": { name: "Estados Unidos", flag: "🇺🇸" },
  "Paraguay": { name: "Paraguay", flag: "🇵🇾" },
  "Haití": { name: "Haití", flag: "🇭🇹" },
  "Escocia": { name: "Escocia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  "Australia": { name: "Australia", flag: "🇦🇺" },
  "Turquía": { name: "Turquía", flag: "🇹🇷" },
  "Brasil": { name: "Brasil", flag: "🇧🇷" },
  "Marruecos": { name: "Marruecos", flag: "🇲🇦" },
  "Catar": { name: "Catar", flag: "🇶🇦" },
  "Suiza": { name: "Suiza", flag: "🇨🇭" },
  "Costa de Marfil": { name: "Costa de Marfil", flag: "🇨🇮" },
  "Ecuador": { name: "Ecuador", flag: "🇪🇨" },
  "Alemania": { name: "Alemania", flag: "🇩🇪" },
  "Curazao": { name: "Curazao", flag: "🇨🇼" },
  "Países Bajos": { name: "Países Bajos", flag: "🇳🇱" },
  "Japón": { name: "Japón", flag: "🇯🇵" },
  "Suecia": { name: "Suecia", flag: "🇸🇪" },
  "Túnez": { name: "Túnez", flag: "🇹🇳" },
  "Arabia Saudita": { name: "Arabia Saudita", flag: "🇸🇦" },
  "Uruguay": { name: "Uruguay", flag: "🇺🇾" },
  "España": { name: "España", flag: "🇪🇸" },
  "Cabo Verde": { name: "Cabo Verde", flag: "🇨🇻" },
  "Irán": { name: "Irán", flag: "🇮🇷" },
  "Nueva Zelanda": { name: "Nueva Zelanda", flag: "🇳🇿" },
  "Bélgica": { name: "Bélgica", flag: "🇧🇪" },
  "Egipto": { name: "Egipto", flag: "🇪🇬" },
  "Francia": { name: "Francia", flag: "🇫🇷" },
  "Senegal": { name: "Senegal", flag: "🇸🇳" },
  "Irak": { name: "Irak", flag: "🇮🇶" },
  "Noruega": { name: "Noruega", flag: "🇳🇴" },
  "Argentina": { name: "Argentina", flag: "🇦🇷" },
  "Argelia": { name: "Argelia", flag: "🇩🇿" },
  "Austria": { name: "Austria", flag: "🇦🇹" },
  "Jordania": { name: "Jordania", flag: "🇯🇴" },
  "Ghana": { name: "Ghana", flag: "🇬🇭" },
  "Panamá": { name: "Panamá", flag: "🇵🇦" },
  "Inglaterra": { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  "Croacia": { name: "Croacia", flag: "🇭🇷" },
  "Portugal": { name: "Portugal", flag: "🇵🇹" },
  "República Democrática del Congo": { name: "República Democrática del Congo", flag: "🇨🇩" },
  "Uzbekistán": { name: "Uzbekistán", flag: "🇺🇿" },
  "Colombia": { name: "Colombia", flag: "🇨🇴" }
};

const MATCHES = [
  { id: 1, group: "Grupo A", team1: "México", team2: "Sudáfrica" },
  { id: 2, group: "Grupo A", team1: "Corea del Sur", team2: "República Checa" },
  { id: 3, group: "Grupo B", team1: "Canadá", team2: "Bosnia y Herzegovina" },
  { id: 4, group: "Grupo D", team1: "Estados Unidos", team2: "Paraguay" },
  { id: 5, group: "Grupo C", team1: "Haití", team2: "Escocia" },
  { id: 6, group: "Grupo D", team1: "Australia", team2: "Turquía" },
  { id: 7, group: "Grupo C", team1: "Brasil", team2: "Marruecos" },
  { id: 8, group: "Grupo B", team1: "Catar", team2: "Suiza" },
  { id: 9, group: "Grupo E", team1: "Costa de Marfil", team2: "Ecuador" },
  { id: 10, group: "Grupo E", team1: "Alemania", team2: "Curazao" },
  { id: 11, group: "Grupo F", team1: "Países Bajos", team2: "Japón" },
  { id: 12, group: "Grupo F", team1: "Suecia", team2: "Túnez" },
  { id: 13, group: "Grupo H", team1: "Arabia Saudita", team2: "Uruguay" },
  { id: 14, group: "Grupo H", team1: "España", team2: "Cabo Verde" },
  { id: 15, group: "Grupo G", team1: "Irán", team2: "Nueva Zelanda" },
  { id: 16, group: "Grupo G", team1: "Bélgica", team2: "Egipto" },
  { id: 17, group: "Grupo I", team1: "Francia", team2: "Senegal" },
  { id: 18, group: "Grupo I", team1: "Irak", team2: "Noruega" },
  { id: 19, group: "Grupo J", team1: "Argentina", team2: "Argelia" },
  { id: 20, group: "Grupo J", team1: "Austria", team2: "Jordania" },
  { id: 21, group: "Grupo L", team1: "Ghana", team2: "Panamá" },
  { id: 22, group: "Grupo L", team1: "Inglaterra", team2: "Croacia" },
  { id: 23, group: "Grupo K", team1: "Portugal", team2: "República Democrática del Congo" },
  { id: 24, group: "Grupo K", team1: "Uzbekistán", team2: "Colombia" },
  { id: 25, group: "Grupo A", team1: "República Checa", team2: "Sudáfrica" },
  { id: 26, group: "Grupo B", team1: "Suiza", team2: "Bosnia y Herzegovina" },
  { id: 27, group: "Grupo B", team1: "Canadá", team2: "Catar" },
  { id: 28, group: "Grupo A", team1: "México", team2: "Corea del Sur" },
  { id: 29, group: "Grupo C", team1: "Brasil", team2: "Haití" },
  { id: 30, group: "Grupo C", team1: "Escocia", team2: "Marruecos" },
  { id: 31, group: "Grupo D", team1: "Turquía", team2: "Paraguay" },
  { id: 32, group: "Grupo D", team1: "Estados Unidos", team2: "Australia" },
  { id: 33, group: "Grupo E", team1: "Alemania", team2: "Costa de Marfil" },
  { id: 34, group: "Grupo E", team1: "Ecuador", team2: "Curazao" },
  { id: 35, group: "Grupo F", team1: "Países Bajos", team2: "Suecia" },
  { id: 36, group: "Grupo F", team1: "Túnez", team2: "Japón" },
  { id: 37, group: "Grupo H", team1: "Uruguay", team2: "Cabo Verde" },
  { id: 38, group: "Grupo H", team1: "España", team2: "Arabia Saudita" },
  { id: 39, group: "Grupo G", team1: "Bélgica", team2: "Irán" },
  { id: 40, group: "Grupo G", team1: "Nueva Zelanda", team2: "Egipto" },
  { id: 41, group: "Grupo I", team1: "Noruega", team2: "Senegal" },
  { id: 42, group: "Grupo I", team1: "Francia", team2: "Irak" },
  { id: 43, group: "Grupo J", team1: "Argentina", team2: "Austria" },
  { id: 44, group: "Grupo J", team1: "Jordania", team2: "Argelia" },
  { id: 45, group: "Grupo L", team1: "Inglaterra", team2: "Ghana" },
  { id: 46, group: "Grupo L", team1: "Panamá", team2: "Croacia" },
  { id: 47, group: "Grupo K", team1: "Portugal", team2: "Uzbekistán" },
  { id: 48, group: "Grupo K", team1: "Colombia", team2: "República Democrática del Congo" },
  { id: 49, group: "Grupo C", team1: "Escocia", team2: "Brasil" },
  { id: 50, group: "Grupo C", team1: "Marruecos", team2: "Haití" },
  { id: 51, group: "Grupo B", team1: "Suiza", team2: "Canadá" },
  { id: 52, group: "Grupo B", team1: "Bosnia y Herzegovina", team2: "Catar" },
  { id: 53, group: "Grupo A", team1: "República Checa", team2: "México" },
  { id: 54, group: "Grupo A", team1: "Sudáfrica", team2: "Corea del Sur" },
  { id: 55, group: "Grupo E", team1: "Curazao", team2: "Costa de Marfil" },
  { id: 56, group: "Grupo E", team1: "Ecuador", team2: "Alemania" },
  { id: 57, group: "Grupo F", team1: "Japón", team2: "Suecia" },
  { id: 58, group: "Grupo F", team1: "Túnez", team2: "Países Bajos" },
  { id: 59, group: "Grupo D", team1: "Turquía", team2: "Estados Unidos" },
  { id: 60, group: "Grupo D", team1: "Paraguay", team2: "Australia" },
  { id: 61, group: "Grupo I", team1: "Noruega", team2: "Francia" },
  { id: 62, group: "Grupo I", team1: "Senegal", team2: "Irak" },
  { id: 63, group: "Grupo G", team1: "Egipto", team2: "Irán" },
  { id: 64, group: "Grupo G", team1: "Nueva Zelanda", team2: "Bélgica" },
  { id: 65, group: "Grupo H", team1: "Cabo Verde", team2: "Arabia Saudita" },
  { id: 66, group: "Grupo H", team1: "Uruguay", team2: "España" },
  { id: 67, group: "Grupo L", team1: "Panamá", team2: "Inglaterra" },
  { id: 68, group: "Grupo L", team1: "Croacia", team2: "Ghana" },
  { id: 69, group: "Grupo J", team1: "Argelia", team2: "Austria" },
  { id: 70, group: "Grupo J", team1: "Jordania", team2: "Argentina" },
  { id: 71, group: "Grupo K", team1: "Colombia", team2: "Portugal" },
  { id: 72, group: "Grupo K", team1: "República Democrática del Congo", team2: "Uzbekistán" }
];

function getTeamLabel(teamName) {
  const team = TEAMS[teamName] || { name: teamName, flag: "" };
  return `${team.flag ? `${team.flag} ` : ""}${team.name}`;
}

function getResultSign(goals1, goals2) {
  if (goals1 > goals2) return "G1";
  if (goals1 < goals2) return "G2";
  return "E";
}

function groupMatches(matches = MATCHES) {
  return matches.reduce((groups, match) => {
    if (!groups[match.group]) groups[match.group] = [];
    groups[match.group].push(match);
    return groups;
  }, {});
}

const KNOCKOUT_MATCHES = [
  { id: 73, phase: "Dieciseisavos", team1: "Sudáfrica", team2: "Canadá", sortOrder: 73 },
  { id: 74, phase: "Dieciseisavos", team1: "Alemania", team2: "Paraguay", sortOrder: 74 },
  { id: 75, phase: "Dieciseisavos", team1: "Países Bajos", team2: "Marruecos", sortOrder: 75 },
  { id: 76, phase: "Dieciseisavos", team1: "Brasil", team2: "Japón", sortOrder: 76 },
  { id: 77, phase: "Dieciseisavos", team1: "Francia", team2: "Suecia", sortOrder: 77 },
  { id: 78, phase: "Dieciseisavos", team1: "Costa de Marfil", team2: "Noruega", sortOrder: 78 },
  { id: 79, phase: "Dieciseisavos", team1: "México", team2: "Ecuador", sortOrder: 79 },
  { id: 80, phase: "Dieciseisavos", team1: "Inglaterra", team2: "República Democrática del Congo", sortOrder: 80 },
  { id: 81, phase: "Dieciseisavos", team1: "Estados Unidos", team2: "Bosnia y Herzegovina", sortOrder: 81 },
  { id: 82, phase: "Dieciseisavos", team1: "Bélgica", team2: "Senegal", sortOrder: 82 },
  { id: 83, phase: "Dieciseisavos", team1: "Portugal", team2: "Croacia", sortOrder: 83 },
  { id: 84, phase: "Dieciseisavos", team1: "España", team2: "Austria", sortOrder: 84 },
  { id: 85, phase: "Dieciseisavos", team1: "Suiza", team2: "Argelia", sortOrder: 85 },
  { id: 86, phase: "Dieciseisavos", team1: "Argentina", team2: "Cabo Verde", sortOrder: 86 },
  { id: 87, phase: "Dieciseisavos", team1: "Colombia", team2: "Ghana", sortOrder: 87 },
  { id: 88, phase: "Dieciseisavos", team1: "Australia", team2: "Egipto", sortOrder: 88 },
  { id: 89, phase: "Octavos", source1Type: "winner", source1MatchId: 74, source2Type: "winner", source2MatchId: 77, sortOrder: 89 },
  { id: 90, phase: "Octavos", team1: "Canadá", source2Type: "winner", source2MatchId: 75, sortOrder: 90 },
  { id: 91, phase: "Octavos", source1Type: "winner", source1MatchId: 76, source2Type: "winner", source2MatchId: 78, sortOrder: 91 },
  { id: 92, phase: "Octavos", source1Type: "winner", source1MatchId: 79, source2Type: "winner", source2MatchId: 80, sortOrder: 92 },
  { id: 93, phase: "Octavos", source1Type: "winner", source1MatchId: 83, source2Type: "winner", source2MatchId: 84, sortOrder: 93 },
  { id: 94, phase: "Octavos", source1Type: "winner", source1MatchId: 81, source2Type: "winner", source2MatchId: 82, sortOrder: 94 },
  { id: 95, phase: "Octavos", source1Type: "winner", source1MatchId: 86, source2Type: "winner", source2MatchId: 88, sortOrder: 95 },
  { id: 96, phase: "Octavos", source1Type: "winner", source1MatchId: 85, source2Type: "winner", source2MatchId: 87, sortOrder: 96 },
  { id: 97, phase: "Cuartos", source1Type: "winner", source1MatchId: 89, source2Type: "winner", source2MatchId: 90, sortOrder: 97 },
  { id: 98, phase: "Cuartos", source1Type: "winner", source1MatchId: 93, source2Type: "winner", source2MatchId: 94, sortOrder: 98 },
  { id: 99, phase: "Cuartos", source1Type: "winner", source1MatchId: 91, source2Type: "winner", source2MatchId: 92, sortOrder: 99 },
  { id: 100, phase: "Cuartos", source1Type: "winner", source1MatchId: 95, source2Type: "winner", source2MatchId: 96, sortOrder: 100 },
  { id: 101, phase: "Semifinales", source1Type: "winner", source1MatchId: 97, source2Type: "winner", source2MatchId: 98, sortOrder: 101 },
  { id: 102, phase: "Semifinales", source1Type: "winner", source1MatchId: 99, source2Type: "winner", source2MatchId: 100, sortOrder: 102 },
  { id: 103, phase: "Tercer puesto", source1Type: "loser", source1MatchId: 101, source2Type: "loser", source2MatchId: 102, sortOrder: 103 },
  { id: 104, phase: "Final", source1Type: "winner", source1MatchId: 101, source2Type: "winner", source2MatchId: 102, sortOrder: 104 }
];

function groupKnockoutMatches(matches = KNOCKOUT_MATCHES) {
  return matches.reduce((groups, match) => {
    if (!groups[match.phase]) groups[match.phase] = [];
    groups[match.phase].push(match);
    return groups;
  }, {});
}
