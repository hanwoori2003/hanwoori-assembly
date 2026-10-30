// 3-4. 애플리케이션 진입점 및 상태 관리
let appState = getDefaultState();

    function saveStateToStorage() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          totalAttendees: appState.totalAttendees,
          activeAgendaId: appState.activeAgendaId,
          uploadedFileName: appState.uploadedFileName,
          currentVoterId: appState.currentVoterId,
          isAdminAuthenticated: appState.isAdminAuthenticated,
          members: appState.members,
          bylaws: appState.bylaws,
          agendas: appState.agendas,
          election: appState.election,
          issues: appState.issues,
          events: appState.events,
          assemblySchedule: appState.assemblySchedule,
          winnerPagePublic: appState.winnerPagePublic
        }));
      } catch (e) {}
      pushStateToCloudIfConnected();
    }

    function loadStateFromStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.agendas) && Array.isArray(parsed.bylaws)) {
            appState.totalAttendees = parsed.totalAttendees || 127;
            appState.activeAgendaId = parsed.activeAgendaId || "ag-1";
            appState.uploadedFileName = parsed.uploadedFileName || appState.uploadedFileName;
            appState.currentVoterId = parsed.currentVoterId || appState.currentVoterId;
            appState.isAdminAuthenticated = Boolean(parsed.isAdminAuthenticated);
            if (Array.isArray(parsed.members) && parsed.members.length >= 100) {
              appState.members = parsed.members;
            }
            appState.bylaws = parsed.bylaws;
            appState.agendas = parsed.agendas;
            if (parsed.election) appState.election = parsed.election;
            appState.issues = parsed.issues || appState.issues;
            appState.events = parsed.events || appState.events;
            if (Array.isArray(parsed.assemblySchedule)) appState.assemblySchedule = parsed.assemblySchedule;
            appState.winnerPagePublic = Boolean(parsed.winnerPagePublic);
          }
        }
        const savedUrl = localStorage.getItem(STORAGE_KEY + "_db_url");
        if (savedUrl) {
          cloudSyncUrl = savedUrl;
          const inp = document.getElementById("inputFirebaseDbUrl");
          if (inp) inp.value = savedUrl;
          startCloudSyncPolling();
        }
      } catch (e) {}
    }

    window.addEventListener("DOMContentLoaded", function() {
      loadStateFromStorage();
      renderAll();
    });
