// 3-1. 유틸리티 및 공통 헬퍼 함수
    function getMajorityThreshold(total) {
      return Math.ceil((total * 2) / 3);
    }

    function getAgendaTallies(agenda) {
      let approve = agenda.baseApprove;
      let reject = agenda.baseReject;
      let abstain = agenda.baseAbstain;
      const votesMap = agenda.memberVotes || {};
      Object.keys(votesMap).forEach(function(memId) {
        const choice = votesMap[memId];
        if (choice === "approve") approve += 1;
        else if (choice === "reject") reject += 1;
        else if (choice === "abstain") abstain += 1;
      });
      const totalVoted = approve + reject + abstain;
      const baseTotal = agenda.voterTotal || appState.totalAttendees;
      const totalAttendees = Math.max(baseTotal, totalVoted);
      const majorityThreshold = agenda.passThreshold && totalVoted === (agenda.baseApprove + agenda.baseReject + agenda.baseAbstain)
        ? agenda.passThreshold
        : getMajorityThreshold(totalAttendees);
      const isAdopted = approve >= majorityThreshold;
      return {
        approve: approve,
        reject: reject,
        abstain: abstain,
        totalVoted: totalVoted,
        remaining: Math.max(0, totalAttendees - totalVoted),
        totalAttendees: totalAttendees,
        majorityThreshold: majorityThreshold,
        isAdopted: isAdopted
      };
    }

    function normalizeArticleQuery(rawQuery) {
      if (!rawQuery) return "";
      const trimmed = rawQuery.trim();
      const match = trimmed.match(/^(?:제\s*)?(\d+)\s*조/);
      if (match) {
        return "제" + match[1] + "조";
      }
      return trimmed;
    }

    function escapeHtml(str) {
      if (!str) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function highlightMatch(text, rawQuery) {
      const safeText = escapeHtml(text);
      if (!rawQuery || !rawQuery.trim()) return safeText;
      const q = rawQuery.trim();
      const norm = normalizeArticleQuery(q);
      const patterns = [];
      if (norm && norm !== q) {
        patterns.push(norm.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"));
      }
      patterns.push(q.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"));
      const regex = new RegExp("(" + patterns.join("|") + ")", "gi");
      return safeText.replace(regex, '<mark class="hl">$1</mark>');
    }

    function matchesSearch(itemTextArray, rawQuery) {
      if (!rawQuery || !rawQuery.trim()) return true;
      const q = rawQuery.trim().toLowerCase();
      const norm = normalizeArticleQuery(q).toLowerCase();
      const noSpaceQ = q.replace(/\s+/g, "");
      const combined = itemTextArray.join(" ").toLowerCase();
      const noSpaceCombined = combined.replace(/\s+/g, "");
      return (
        combined.indexOf(q) !== -1 ||
        (norm && combined.indexOf(norm) !== -1) ||
        (noSpaceQ && noSpaceCombined.indexOf(noSpaceQ) !== -1)
      );
    }

    function getCurrentVoter() {
      return appState.members.find(function(m) { return m.id === appState.currentVoterId; }) || appState.members[0];
    }

    function getActiveAgenda() {
      return appState.agendas.find(function(a) { return a.id === appState.activeAgendaId; }) || appState.agendas[0];
    }

    function triggerDownloadBlob(content, filename, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    let toastTimer = null;
    function showToast(msg) {
      const banner = document.getElementById("toastBanner");
      const textEl = document.getElementById("toastMessageText");
      textEl.textContent = msg;
      banner.classList.remove("hidden");
      banner.classList.add("flex");
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function() {
        banner.classList.add("hidden");
        banner.classList.remove("flex");
      }, 3500);
    }

    function copyTextToClipboard(text, successMsg) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        showToast(successMsg);
      } catch (err) {
        showToast("클립보드 복사에 실패했습니다.");
      }
      document.body.removeChild(textarea);
    }
