// ============================================================================
// Firebase Firestore 실시간 멀티 디바이스 동기화 설정 파일 (js/firebase-config.js)
// ============================================================================
// [설정 방법]
// 1. Firebase Console (https://console.firebase.google.com)에서 프로젝트를 생성합니다.
// 2. [프로젝트 설정] -> [내 앱] -> 웹 앱(</>) 추가 후 표시되는 firebaseConfig 6줄을
//    아래 window.HANWOORI_FIREBASE_CONFIG 객체의 따옴표("") 안에 그대로 붙여넣으세요.
// 3. 자세한 단계별 안내는 같은 폴더의 FIREBASE_SETUP_GUIDE.md 파일을 참고하세요.
//
// ※ 비어 있는 상태(기본값)에서는 앱이 자동으로 [로컬 저장 모드]로 동작하며,
//    오류 없이 기존과 100% 동일하게 브라우저 localStorage로 작동합니다.
// ============================================================================

window.HANWOORI_FIREBASE_CONFIG = {
    apiKey: "AIzaSyDjvryU8DmFiNhdrazdGkkA-mCd0aJj9pY",
    authDomain: "hanwoori-assembly-2026.firebaseapp.com",
    projectId: "hanwoori-assembly-2026",
    storageBucket: "hanwoori-assembly-2026.firebasestorage.app",
    messagingSenderId: "960405130599",
    appId: "1:960405130599:web:4defcf54d094a4ea06b3c2"
};

/**
 * Firebase 설정이 유효하게 입력되었는지 확인합니다.
 * apiKey와 projectId가 비어있지 않고 플레이스홀더 문자열이 아닌 경우에만 true를 반환합니다.
 */
window.isFirebaseConfigured = function isFirebaseConfigured() {
    var cfg = window.HANWOORI_FIREBASE_CONFIG;
    if (!cfg || typeof cfg !== "object") return false;

    var apiKey = typeof cfg.apiKey === "string" ? cfg.apiKey.trim() : "";
    var projectId = typeof cfg.projectId === "string" ? cfg.projectId.trim() : "";

    if (!apiKey || !projectId) return false;

    var placeholderPattern = /^(YOUR_|REPLACE_|EXAMPLE|여기에|입력|<|\.\.\.)/i;
    if (placeholderPattern.test(apiKey) || placeholderPattern.test(projectId)) {
        return false;
    }

    return true;
};
