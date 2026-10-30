// 3. 유틸리티, 로컬 스토리지 관리, 득표 집계, 검색 헬퍼 및 DOCX/TXT 단칙 파서 (js/utils.js)

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
  if (typeof pushStateToCloudIfConnected === "function") {
    pushStateToCloudIfConnected();
  }
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
        if (Array.isArray(parsed.assemblySchedule) && parsed.assemblySchedule.length > 0) {
          appState.assemblySchedule = parsed.assemblySchedule;
        }
        appState.winnerPagePublic = Boolean(parsed.winnerPagePublic);
      }
    }
    const savedUrl = localStorage.getItem(STORAGE_KEY + "_db_url");
    if (savedUrl) {
      cloudSyncUrl = savedUrl;
      const inp = document.getElementById("inputFirebaseDbUrl");
      if (inp) inp.value = savedUrl;
      if (typeof startCloudSyncPolling === "function") {
        startCloudSyncPolling();
      }
    }
  } catch (e) {}
}

function resetToDefaultInitialData() {
  appState = getDefaultState();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  switchMainTab("events");
  renderAll();
  closeCloudSyncModal();
  showToast("첨부된 전체 단원 명부(134명), 2026 운영진(18명), 단칙(32개 조항) 및 실제 개정안(12건) 초기 데이터로 복원되었습니다.");
}

    // =========================================================================
    // 2. .DOCX / .TXT / .MD BYLAW FILE UPLOAD & AUTO-PARSER
    // =========================================================================

    function triggerBylawFileUpload() {
      const inp = document.getElementById("hiddenBylawUploadInput");
      if (inp) {
        inp.value = "";
        inp.click();
      }
    }

    function parseRawBylawLinesIntoClauses(lines) {
      const chapterRe = /^(제\s*\d+\s*장\s*.+)$/;
      const articleRe = /^(제\s*(\d+)\s*조)\s*(?:\\(([^)]+)\\))?\s*(.*)$/;
      const clauses = [];
      let currentChapter = "제1장 총칙";
      let currentArticle = null;

      lines.forEach(function(rawLine) {
        const line = rawLine.replace(/\s+/g, " ").trim();
        if (!line) return;
        const mCh = line.match(chapterRe);
        if (mCh) {
          currentChapter = mCh[1].replace(/\s+/g, " ").trim();
          return;
        }
        const mArt = line.match(articleRe);
        if (mArt) {
          if (currentArticle) clauses.push(currentArticle);
          const artNum = "제" + mArt[2] + "조";
          const artTitle = (mArt[3] || "부칙").trim();
          const rest = (mArt[4] || "").trim();
          currentArticle = {
            id: "cl-" + mArt[2] + "-" + (clauses.length + 1),
            chapter: currentChapter,
            articleNo: artNum,
            title: artTitle,
            contentLines: rest ? [rest] : [],
            lastAmended: ""
          };
        } else if (currentArticle) {
          currentArticle.contentLines.push(line);
        }
      });

      if (currentArticle) clauses.push(currentArticle);

      const kwCandidates = [
        "정단원", "준단원", "휴단원", "명예단원", "특별단원",
        "단장", "부단장", "운영진", "지휘자", "반주자", "파트장",
        "정기총회", "임시총회", "쉐도우 보팅", "정기연주회", "출석률",
        "오디션", "정기회비", "행사회비", "연회비", "환불",
        "대외활동", "수익", "회계", "개정", "비상상황"
      ];

      clauses.forEach(function(c) {
        const joined = [];
        c.contentLines.forEach(function(l) {
          if (joined.length === 0) {
            joined.push(l);
          } else if (/^([①②③④⑤⑥⑦⑧⑨⑩]|[가나다라마바사]\\.|\-\s|\\([가-힣\s]+\\)|본 단칙은)/.test(l)) {
            joined.push("\n" + l);
          } else {
            joined[joined.length - 1] = joined[joined.length - 1] + " " + l;
          }
        });
        c.content = joined.join("").trim();
        delete c.contentLines;

        const kws = [c.articleNo, c.title];
        kwCandidates.forEach(function(cand) {
          if ((c.content.indexOf(cand) !== -1 || c.title.indexOf(cand) !== -1) && kws.indexOf(cand) === -1) {
            kws.push(cand);
          }
        });
        c.keywords = kws.slice(0, 8);
      });

      return clauses;
    }

    function handleBylawFileUpload(inputEl) {
      const file = inputEl.files && inputEl.files[0];
      if (!file) return;
      const fileName = file.name;
      const lower = fileName.toLowerCase();

      if (lower.endsWith(".docx")) {
        if (typeof JSZip === "undefined") {
          showToast("DOCX 파서 라이브러리를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
          return;
        }
        const reader = new FileReader();
        reader.onload = function(evt) {
          JSZip.loadAsync(evt.target.result)
            .then(function(zip) {
              const docXmlFile = zip.file("word/document.xml");
              if (!docXmlFile) {
                throw new Error("word/document.xml not found");
              }
              return docXmlFile.async("string");
            })
            .then(function(xmlText) {
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(xmlText, "application/xml");
              const paragraphs = xmlDoc.getElementsByTagName("w:p");
              const lines = [];
              for (let i = 0; i < paragraphs.length; i++) {
                const p = paragraphs[i];
                const tNodes = p.getElementsByTagName("w:t");
                const parts = [];
                for (let j = 0; j < tNodes.length; j++) {
                  const tNode = tNodes[j];
                  let parent = tNode.parentNode;
                  let inDel = false;
                  while (parent && parent !== p) {
                    if (parent.nodeName === "w:del") {
                      inDel = true;
                      break;
                    }
                    parent = parent.parentNode;
                  }
                  if (!inDel && tNode.textContent) {
                    parts.push(tNode.textContent);
                  }
                }
                const lineStr = parts.join("").replace(/\s+/g, " ").trim();
                if (lineStr) lines.push(lineStr);
              }
              const parsedClauses = parseRawBylawLinesIntoClauses(lines);
              if (parsedClauses.length > 0) {
                appState.bylaws = parsedClauses;
                appState.uploadedFileName = fileName;
                saveStateToStorage();
                switchMainTab("bylaws");
                renderAll();
                showToast("‘" + fileName + "’ 업로드 완료! 총 " + parsedClauses.length + "개 단칙 조항이 [현재 단칙 보기] 및 [단칙 검색] 화면에 반영되었습니다.");
              } else {
                showToast("파일에서 ‘제1조’ 형식의 단칙 조항을 찾지 못했습니다.");
              }
            })
            .catch(function() {
              showToast("DOCX 단칙 파일 분석 중 오류가 발생했습니다.");
            });
        };
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = function(evt) {
          const text = evt.target.result || "";
          const lines = text.split(/\r?\n/);
          const parsedClauses = parseRawBylawLinesIntoClauses(lines);
          if (parsedClauses.length > 0) {
            appState.bylaws = parsedClauses;
            appState.uploadedFileName = fileName;
            saveStateToStorage();
            switchMainTab("bylaws");
            renderAll();
            showToast("‘" + fileName + "’ 업로드 완료! 총 " + parsedClauses.length + "개 조항이 반영되었습니다.");
          } else {
            showToast("텍스트에서 ‘제1조’ 형식의 조항을 찾지 못했습니다.");
          }
        };
        reader.readAsText(file, "utf-8");
      }
    }

    // =========================================================================
    // 3. CORE HELPER FUNCTIONS (단칙 제30조 2/3 찬성 가결 기준 지원)
    // =========================================================================

    function getMajorityThreshold(total) {
      // 단칙 제30조 제1항: 투표권을 가진 회원 2/3 이상의 찬성으로써 개정할 수 있다. (예: 37명->25표, 38명->26표, 36명->24표)
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
        patterns.push(norm.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&"));
      }
      patterns.push(q.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&"));
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


    function formatAttCell(val) {
      if (!val || val === "-") return '<span class="text-slate-300">-</span>';
      if (val.indexOf("출석 1") !== -1) {
        return '<span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[11px]">' + escapeHtml(val) + '</span>';
      }
      if (val.indexOf("지각") !== -1 || val.indexOf("조퇴") !== -1) {
        return '<span class="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold text-[11px]">' + escapeHtml(val) + '</span>';
      }
      return '<span class="text-slate-600 text-[11px]">' + escapeHtml(val) + '</span>';
    }


    function getActiveCandidates() {
      const elec = appState.election;
      const count = elec.mode === "single" ? 1 : Math.max(2, elec.activeCandidateCount || 2);
      return elec.candidates.slice(0, count);
    }

    function getElectionTallies() {
      const elec = appState.election;
      if (elec.mode === "single") {
        let approve = elec.singleVotes.approve;
        let reject = elec.singleVotes.reject;
        let abstain = elec.singleVotes.abstain;
        const mv = elec.singleVotes.memberVotes || {};
        Object.keys(mv).forEach(function(mid) {
          if (mv[mid] === "approve") approve += 1;
          else if (mv[mid] === "reject") reject += 1;
          else if (mv[mid] === "abstain") abstain += 1;
        });
        const totalVoted = approve + reject + abstain;
        const totalPool = Math.max(elec.totalVoters || 38, totalVoted);
        const passThreshold = Math.ceil((totalPool * 2) / 3);
        const isElected = approve >= passThreshold;
        return {
          mode: "single",
          approve: approve,
          reject: reject,
          abstain: abstain,
          totalVoted: totalVoted,
          totalPool: totalPool,
          passThreshold: passThreshold,
          isElected: isElected,
          winner: elec.candidates[0]
        };
      } else {
        const cands = getActiveCandidates();
        const counts = {};
        cands.forEach(function(c) { counts[c.id] = c.baseVotes || 0; });
        const mv = elec.multiMemberVotes || {};
        Object.keys(mv).forEach(function(mid) {
          const cid = mv[mid];
          if (counts[cid] !== undefined) counts[cid] += 1;
        });
        let totalVoted = 0;
        let topCand = cands[0];
        let topVotes = -1;
        cands.forEach(function(c) {
          const v = counts[c.id] || 0;
          totalVoted += v;
          if (v > topVotes) {
            topVotes = v;
            topCand = c;
          }
        });
        const totalPool = Math.max(elec.totalVoters || 38, totalVoted);
        return {
          mode: "multi",
          counts: counts,
          totalVoted: totalVoted,
          totalPool: totalPool,
          topVotes: topVotes,
          winner: topCand
        };
      }
    }


    function normalizeFirebaseEndpoint(rawUrl) {
      if (!rawUrl) return "";
      let u = rawUrl.trim().replace(/\/+$/, "");
      if (u.indexOf("https://") !== 0) return "";
      if (!u.endsWith(".json")) {
        u = u + "/hanuri_assembly_2026.json";
      }
      return u;
    }

