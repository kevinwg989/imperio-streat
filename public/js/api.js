// Cliente de API e Utilitários - IMPÉRIO STREETWEAR

const API = {
  // Formatação de Moeda Brasileira (BRL)
  formatBRL(value) {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  },

  // Formatação de Data
  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  },

  // Chamada genérica à API
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json'
    };

    const token = localStorage.getItem('imperio_admin_token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro na requisição ao servidor.');
      }

      return data;
    } catch (err) {
      console.error(`Erro na requisição ${url}:`, err);
      throw err;
    }
  },

  // Produtos e Categorias
  getCategories() {
    return this.request('/products/categories');
  },

  getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/products?${query}`);
  },

  getProductBySlug(slug) {
    return this.request(`/products/${slug}`);
  },

  // Pedidos e Checkout
  createOrder(payload) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getOrderByCode(code) {
    return this.request(`/orders/${code}`);
  },

  simulateSandboxPix(orderCode) {
    return this.request('/orders/simulate-sandbox-pix', {
      method: 'POST',
      body: JSON.stringify({ order_code: orderCode })
    });
  },

  // Configurações Públicas (WhatsApp, Nome da Loja, Avisos)
  getSettings() {
    return this.request('/settings');
  },

  // Admin
  adminLogin(email, password) {
    return this.request('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  adminLogout() {
    localStorage.removeItem('imperio_admin_token');
    return this.request('/admin/logout', { method: 'POST' });
  },

  getAdminStats() {
    return this.request('/admin/dashboard-stats');
  },

  getAdminOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/orders?${query}`);
  },

  updateOrderStatus(orderId, status, notes = '') {
    return this.request(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes })
    });
  },

  getAdminProducts() {
    return this.request('/admin/products');
  },

  createProduct(payload) {
    return this.request('/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  updateProduct(id, payload) {
    return this.request(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  toggleProductDemo(id) {
    return this.request(`/admin/products/${id}/toggle-demo`, {
      method: 'PATCH'
    });
  },

  toggleProductActive(id) {
    return this.request(`/admin/products/${id}/toggle-active`, {
      method: 'PATCH'
    });
  },

  updateVariantStock(variantId, stock) {
    return this.request(`/admin/variants/${variantId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock_quantity: stock })
    });
  }
};

window.API = API;
