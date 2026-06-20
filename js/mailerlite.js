// Mailerlite subscribe handler — submit via fetch, show inline success message
// No external dependencies, no Mailerlite scripts loaded.

document.addEventListener('DOMContentLoaded', function () {
  const forms = document.querySelectorAll('form.ml-subscribe');

  forms.forEach(function (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const button = form.querySelector('button[type="submit"]');
      const input = form.querySelector('input[type="email"]');
      const successBox = form.parentElement.querySelector('.ml-success');

      if (!input.value || !input.checkValidity()) {
        input.focus();
        return;
      }

      const tr = (key, fallback) =>
        (window.GemI18n && window.GemI18n.t(key)) || fallback;

      const originalButtonText = button.textContent;
      button.disabled = true;
      button.textContent = tr('common.ml_sending', 'Đang gửi...');

      try {
        const formData = new FormData(form);

        // Mailerlite endpoint accepts CORS POST with no-cors mode
        // We can't read the response, but submission goes through
        await fetch(form.action, {
          method: 'POST',
          body: formData,
          mode: 'no-cors'
        });

        // Always show success — Mailerlite handles duplicate emails gracefully
        form.hidden = true;
        if (successBox) {
          successBox.hidden = false;
        }
      } catch (err) {
        button.disabled = false;
        button.textContent = originalButtonText;
        alert(tr('common.ml_error', 'Có lỗi xảy ra. Bạn thử lại sau giúp chúng mình nhé.'));
        console.error('Mailerlite submit error:', err);
      }
    });
  });
});