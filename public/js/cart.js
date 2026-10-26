// Gerenciador do Carrinho de Compras - IMPÉRIO STREETWEAR

const Cart = {
  STORAGE_KEY: 'imperio_cart_v1',

  getCart() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Erro ao ler carrinho:', e);
      return [];
    }
  },

  saveCart(cart) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cart));
      this.updateCartBadge();
      this.renderDrawer();
    } catch (e) {
      console.error('Erro ao salvar carrinho:', e);
    }
  },

  addItem(product, variant, quantity = 1) {
    if (!product || !variant) {
      if (window.UI) UI.showToast('Selecione o tamanho e a cor antes de adicionar.', 'warning');
      return false;
    }

    if (product.is_demo === 1) {
      if (window.UI) {
        UI.showToast('Esta peça é demonstrativa de catálogo (pré-lançamento) e aguarda validação de fornecedor.', 'warning');
      }
      return false;
    }

    const cart = this.getCart();
    const existingIndex = cart.findIndex(item => item.variant_id === variant.id);

    const qty = Math.max(parseInt(quantity, 10) || 1, 1);

    if (existingIndex > -1) {
      const newQty = cart[existingIndex].quantity + qty;
      if (variant.stock_quantity && newQty > variant.stock_quantity) {
        if (window.UI) UI.showToast(`Estoque máximo atingido (${variant.stock_quantity} unidades disponíveis).`, 'warning');
        return false;
      }
      cart[existingIndex].quantity = newQty;
    } else {
      let image = '/assets/images/placeholder.svg';
      if (product.images && product.images.length > 0) {
        image = product.images[0];
      }

      cart.push({
        product_id: product.id,
        variant_id: variant.id,
        name: product.name,
        slug: product.slug,
        size: variant.size,
        color: variant.color,
        price: Number(product.price),
        image: image,
        quantity: qty,
        is_demo: product.is_demo || 0,
        max_stock: variant.stock_quantity || 10
      });
    }

    this.saveCart(cart);
    if (window.UI) UI.showToast(`"${product.name}" adicionado à sacola!`, 'success');
    this.openDrawer();
    return true;
  },

  updateQuantity(variantId, newQuantity) {
    let cart = this.getCart();
    const item = cart.find(i => i.variant_id === variantId);
    if (!item) return;

    const qty = parseInt(newQuantity, 10);
    if (qty <= 0) {
      this.removeItem(variantId);
      return;
    }

    if (item.max_stock && qty > item.max_stock) {
      if (window.UI) UI.showToast(`Quantidade máxima disponível: ${item.max_stock}`, 'warning');
      item.quantity = item.max_stock;
    } else {
      item.quantity = qty;
    }

    this.saveCart(cart);
  },

  removeItem(variantId) {
    let cart = this.getCart();
    cart = cart.filter(i => i.variant_id !== variantId);
    this.saveCart(cart);
    if (window.UI) UI.showToast('Item removido da sacola.', 'info');
  },

  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.updateCartBadge();
    this.renderDrawer();
  },

  getCount() {
    return this.getCart().reduce((sum, item) => sum + item.quantity, 0);
  },

  getSubtotal() {
    return this.getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  updateCartBadge() {
    const badges = document.querySelectorAll('.cart-count-badge');
    const count = this.getCount();
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  openDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const backdrop = document.getElementById('cartBackdrop');
    if (drawer) drawer.classList.add('active');
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const backdrop = document.getElementById('cartBackdrop');
    if (drawer) drawer.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
  },

  renderDrawer() {
    const container = document.getElementById('cartDrawerItems');
    const subtotalEl = document.getElementById('cartDrawerSubtotal');
    const checkoutBtn = document.getElementById('cartDrawerCheckoutBtn');

    if (!container) return;

    const cart = this.getCart();
    const subtotal = this.getSubtotal();

    if (subtotalEl) {
      subtotalEl.textContent = window.API ? API.formatBRL(subtotal) : `R$ ${subtotal.toFixed(2)}`;
    }

    if (checkoutBtn) {
      checkoutBtn.disabled = cart.length === 0;
    }

    if (cart.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <svg style="width: 48px; height: 48px; stroke: currentColor; fill: none; margin-bottom: 1rem; opacity: 0.4;" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <p style="font-size: 0.95rem; font-weight: 600; color: #FFFFFF; margin-bottom: 0.5rem;">Sua sacola está vazia</p>
          <p style="font-size: 0.82rem;">Explore nossos lançamentos streetwear e adicione peças exclusivas.</p>
          <a href="/catalogo" class="btn btn-primary btn-sm" style="margin-top: 1.5rem;" onclick="Cart.closeDrawer()">Ver Catálogo</a>
        </div>
      `;
      return;
    }

    container.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}">
        <div class="cart-item-info">
          <div>
            <h4 class="cart-item-title">${item.name}</h4>
            <p class="cart-item-meta">Tam: <strong>${item.size}</strong> • Cor: <strong>${item.color}</strong></p>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.5rem;">
            <div class="qty-stepper">
              <button class="qty-btn" onclick="Cart.updateQuantity(${item.variant_id}, ${item.quantity - 1})">−</button>
              <span class="qty-val">${item.quantity}</span>
              <button class="qty-btn" onclick="Cart.updateQuantity(${item.variant_id}, ${item.quantity + 1})">+</button>
            </div>
            <div style="text-align: right;">
              <div class="cart-item-price">${window.API ? API.formatBRL(item.price * item.quantity) : `R$ ${(item.price * item.quantity).toFixed(2)}`}</div>
              <button style="font-size: 0.72rem; color: #ef4444; margin-top: 2px;" onclick="Cart.removeItem(${item.variant_id})">Remover</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }
};

window.Cart = Cart;

document.addEventListener('DOMContentLoaded', () => {
  Cart.updateCartBadge();
  Cart.renderDrawer();
});
