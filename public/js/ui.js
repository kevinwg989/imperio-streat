// Helpers Universais de Interface - IMPÉRIO STREETWEAR

const UI = {
  // Toast notifications
  showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = `
      <svg style="width: 18px; height: 18px; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    `;

    if (type === 'success') {
      icon = `
        <svg style="width: 18px; height: 18px; color: #10b981; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      `;
    } else if (type === 'warning') {
      icon = `
        <svg style="width: 18px; height: 18px; color: #f59e0b; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      `;
    } else if (type === 'error') {
      icon = `
        <svg style="width: 18px; height: 18px; color: #ef4444; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      `;
    }

    toast.innerHTML = `
      ${icon}
      <div style="flex: 1; line-height: 1.4;">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  },

  // Menu Mobile
  toggleMobileMenu() {
    const drawer = document.getElementById('mobileMenuDrawer');
    const backdrop = document.getElementById('mobileMenuBackdrop');
    if (drawer && backdrop) {
      const isOpen = drawer.classList.contains('active');
      if (isOpen) {
        drawer.classList.remove('active');
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
      } else {
        drawer.classList.add('active');
        backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    }
  },

  // Inicializar Botão WhatsApp Dinâmico via API
  async initWhatsAppButton() {
    try {
      const res = await API.getSettings();
      if (res && res.success && res.data) {
        const { whatsapp_number, whatsapp_message, announcement_bar } = res.data;

        // Atualizar links do WhatsApp
        const waButtons = document.querySelectorAll('.whatsapp-dynamic-link');
        const cleanNumber = whatsapp_number.replace(/\D/g, '');
        const encodedMsg = encodeURIComponent(whatsapp_message);
        const waUrl = `https://wa.me/${cleanNumber}?text=${encodedMsg}`;

        waButtons.forEach(btn => {
          btn.href = waUrl;
          btn.target = '_blank';
          btn.rel = 'noopener noreferrer';
        });

        // Atualizar barra de anúncios caso exista
        const announceEl = document.getElementById('announcementBarText');
        if (announceEl && announcement_bar) {
          announceEl.textContent = announcement_bar;
        }
      }
    } catch (e) {
      console.warn('Configurações da loja não puderam ser carregadas:', e);
    }
  }
};

window.UI = UI;

document.addEventListener('DOMContentLoaded', () => {
  UI.initWhatsAppButton();

  // Fechar gavetas ao clicar no backdrop
  const cartBackdrop = document.getElementById('cartBackdrop');
  if (cartBackdrop) {
    cartBackdrop.addEventListener('click', () => Cart.closeDrawer());
  }

  const mobileBackdrop = document.getElementById('mobileMenuBackdrop');
  if (mobileBackdrop) {
    mobileBackdrop.addEventListener('click', () => UI.toggleMobileMenu());
  }
});
