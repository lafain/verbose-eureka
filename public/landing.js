const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const guestBtn = document.getElementById('guestBtn');

function setActive(tab) {
  if (tab === 'login') {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
  } else {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
  }
}

loginTab.addEventListener('click', () => setActive('login'));
registerTab.addEventListener('click', () => setActive('register'));

actionHandler(loginForm, 'loginUser');
actionHandler(registerForm, 'regUser');

guestBtn.addEventListener('click', () => {
  const guestName = `Guest-${Math.floor(Math.random() * 10000)}`;
  localStorage.setItem('ftd_player', guestName);
  try { localStorage.setItem('ftd_is_guest', '1'); } catch(_){}
  const map = localStorage.getItem('ftd_last_map') || 'map1';
  window.location.href = `/ftd?map=${map}&intro=1`;
});

function actionHandler(form, userFieldId) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById(userFieldId).value.trim();
    if (!username) return;
    // For prototype: store username and proceed. Password ignored locally.
    localStorage.setItem('ftd_player', username);
    try { localStorage.setItem('ftd_is_guest', '0'); } catch(_){}
    const map = localStorage.getItem('ftd_last_map') || 'map1';
  window.location.href = `/ftd?map=${map}&intro=1`;
  });
} 