const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
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

function actionHandler(form, userFieldId) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById(userFieldId).value.trim();
    if (!username) return;
    // Store login username and redirect to character creation
    localStorage.setItem('ftd_login_user', username);
    localStorage.removeItem('ftd_is_guest'); // Remove any guest flag
    window.location.href = '/character-creation.html';
  });
} 