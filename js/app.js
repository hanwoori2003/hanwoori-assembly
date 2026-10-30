// 6. 앱 상태(appState) 초기화, 통합 렌더링(renderAll), 토스트 알림 및 초기 구동 모듈 (js/app.js)

let appState = getDefaultState();

function renderAll() {
  renderHeaderStatus();
  renderExecutiveRosterTable();
  renderFullMemberRosterTable();
  renderEventsView();
  renderCurrentBylawsView();
  renderFullSearchView();
  renderDrawerSearchResults();
  renderAgendaStepper();
  renderActiveVotingView();
  renderElectionView();
  renderWinnerView();
  renderSettlementView();
  renderAdminView();
  renderAuthModalMemberList();
}

let toastTimer = null;
function showToast(msg) {
  const banner = document.getElementById("toastBanner");
  const textEl = document.getElementById("toastMessageText");
  if (!banner || !textEl) return;
  textEl.textContent = msg;
  banner.classList.remove("hidden");
  banner.classList.add("flex");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function() {
    banner.classList.add("hidden");
    banner.classList.remove("flex");
  }, 3500);
}

window.addEventListener("DOMContentLoaded", function() {
  loadStateFromStorage();
  renderAll();
});
