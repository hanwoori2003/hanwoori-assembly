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

// Window scroll event listener for slim sticky header with multi-browser scrollY fallback & init check
function updateHeaderSlim() {
  const header = document.getElementById("mainHeader");
  if (!header) return;
  const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || (document.body ? document.body.scrollTop : 0) || 0;
  if (scrollY > 30) {
    header.classList.add("header-slim");
  } else {
    header.classList.remove("header-slim");
  }
}

window.addEventListener("scroll", updateHeaderSlim, { passive: true });

window.addEventListener("DOMContentLoaded", function() {
  loadStateFromStorage();
  renderAll();
  updateHeaderSlim();
});
