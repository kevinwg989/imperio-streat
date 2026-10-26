// Lógica do Painel Administrativo - IMPÉRIO STREETWEAR

// Verificação de autenticação
function checkAdminAuth() {
  const isLoginPage = window.location.pathname.includes('/admin/login');
  const token = localStorage.getItem('imperio_admin_token');

  if (!token && !isLoginPage) {
    window.location.href = '/admin/login';
    return false;
  }

  if (token && isLoginPage) {
    window.location.href = '/admin';
    return false;
  }

  return true;
}

// Login
async function handleAdminLogin(e) {
  if (e) e.preventDefault();
  const emailInput = document.getElementById('adminLoginEmail');
  const passInput = document.getElementById('adminLoginPass');
  const errorEl = document.getElementById('adminLoginError');
  const submitBtn = document.getElementById('adminLoginBtn');

  if (!emailInput || !passInput) return;

  const email = emailInput.value.trim();
  const password = passInput.value.trim();

  if (errorEl) errorEl.style.display = 'none';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Autenticando...';
  }

  try {
    const res = await API.adminLogin(email, password);
    if (res.success && res.token) {
      localStorage.setItem('imperio_admin_token', res.token);
      localStorage.setItem('imperio_admin_user', JSON.stringify(res.admin));
      window.location.href = '/admin';
    }
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = err.message || 'Erro ao realizar login.';
      errorEl.style.display = 'block';
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Acessar Painel';
    }
  }
}

// Logout
async function handleAdminLogout() {
  try {
    await API.adminLogout();
  } catch (e) {
    console.warn(e);
  }
  localStorage.removeItem('imperio_admin_token');
  localStorage.removeItem('imperio_admin_user');
  window.location.href = '/admin/login';
}

// Dashboard Stats
async function loadDashboard() {
  const revenueEl = document.getElementById('dashRevenue');
  const totalOrdersEl = document.getElementById('dashTotalOrders');
  const pendingOrdersEl = document.getElementById('dashPendingOrders');
  const totalProductsEl = document.getElementById('dashTotalProducts');
  const demoProductsEl = document.getElementById('dashDemoProducts');
  const lowStockTable = document.getElementById('dashLowStockTable');
  const recentOrdersTable = document.getElementById('dashRecentOrdersTable');

  try {
    const res = await API.getAdminStats();
    if (!res.success) return;
    const d = res.data;

    if (revenueEl) revenueEl.textContent = API.formatBRL(d.revenue);
    if (totalOrdersEl) totalOrdersEl.textContent = d.total_orders;
    if (pendingOrdersEl) pendingOrdersEl.textContent = d.pending_orders;
    if (totalProductsEl) totalProductsEl.textContent = d.total_products;
    if (demoProductsEl) demoProductsEl.textContent = d.demo_products;

    if (lowStockTable) {
      if (d.low_stock_variants && d.low_stock_variants.length > 0) {
        lowStockTable.innerHTML = d.low_stock_variants.map(v => `
          <tr>
            <td><strong>${v.product_name}</strong></td>
            <td>Tam: ${v.size} / ${v.color}</td>
            <td><code>${v.sku}</code></td>
            <td><span style="color: #ef4444; font-weight: 700;">${v.stock_quantity} un</span></td>
          </tr>
        `).join('');
      } else {
        lowStockTable.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Nenhum produto com estoque crítico no momento.</td></tr>`;
      }
    }

    if (recentOrdersTable) {
      if (d.recent_orders && d.recent_orders.length > 0) {
        recentOrdersTable.innerHTML = d.recent_orders.map(o => `
          <tr>
            <td><strong>${o.order_code}</strong></td>
            <td>${o.customer_name}</td>
            <td>${API.formatBRL(o.total)}</td>
            <td><span class="status-pill status-${o.status}">${formatStatusLabel(o.status)}</span></td>
            <td>${API.formatDate(o.created_at)}</td>
          </tr>
        `).join('');
      } else {
        recentOrdersTable.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Nenhum pedido registrado ainda.</td></tr>`;
      }
    }
  } catch (err) {
    if (err.message && err.message.includes('não autorizado')) {
      handleAdminLogout();
    }
  }
}

function formatStatusLabel(st) {
  const map = {
    pendente: 'Pendente',
    pago: 'Pago',
    em_separacao: 'Em Separação',
    enviado: 'Enviado',
    entregue: 'Entregue',
    cancelado: 'Cancelado'
  };
  return map[st] || st;
}

// Gestão de Pedidos
async function loadAdminOrders(status = 'todos') {
  const table = document.getElementById('adminOrdersTable');
  if (!table) return;

  try {
    const res = await API.getAdminOrders({ status });
    if (!res.success || !res.data) return;

    if (res.data.length === 0) {
      table.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">Nenhum pedido encontrado neste filtro.</td></tr>`;
      return;
    }

    table.innerHTML = res.data.map(o => `
      <tr>
        <td><strong>${o.order_code}</strong></td>
        <td>
          <div style="font-weight: 600; color: #FFFFFF;">${o.customer_name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${o.customer_email} • ${o.shipping_city}/${o.shipping_state}</div>
        </td>
        <td>
          <span style="font-weight: 700;">${API.formatBRL(o.total)}</span>
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">${o.payment_method}</div>
        </td>
        <td>
          <select class="form-control" style="padding: 0.35rem 0.6rem; font-size: 0.78rem; width: auto;" onchange="changeOrderStatus(${o.id}, this.value)">
            <option value="pendente" ${o.status === 'pendente' ? 'selected' : ''}>Pendente</option>
            <option value="pago" ${o.status === 'pago' ? 'selected' : ''}>Pago</option>
            <option value="em_separacao" ${o.status === 'em_separacao' ? 'selected' : ''}>Em Separação</option>
            <option value="enviado" ${o.status === 'enviado' ? 'selected' : ''}>Enviado</option>
            <option value="entregue" ${o.status === 'entregue' ? 'selected' : ''}>Entregue</option>
            <option value="cancelado" ${o.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
        </td>
        <td>${API.formatDate(o.created_at)}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="viewOrderDetailsModal(${o.id})">Detalhes</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Erro ao listar pedidos:', err);
  }
}

async function changeOrderStatus(orderId, newStatus) {
  try {
    const res = await API.updateOrderStatus(orderId, newStatus);
    if (res.success) {
      if (window.UI) UI.showToast(`Pedido atualizado para "${formatStatusLabel(newStatus)}"!`, 'success');
    }
  } catch (err) {
    if (window.UI) UI.showToast(err.message, 'error');
  }
}

// Gestão de Produtos
async function loadAdminProducts() {
  const table = document.getElementById('adminProductsTable');
  if (!table) return;

  try {
    const res = await API.getAdminProducts();
    if (!res.success || !res.data) return;

    table.innerHTML = res.data.map(p => {
      const primaryImg = p.images && p.images.length > 0 ? p.images[0] : '/assets/images/placeholder.svg';
      const isDemo = p.is_demo === 1;
      const isActive = p.is_active === 1;

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <img src="${primaryImg}" alt="${p.name}" style="width: 44px; height: 55px; object-fit: cover; border-radius: var(--radius-xs); background: #18181b;">
              <div>
                <a href="/produto/${p.slug}" target="_blank" style="font-weight: 700; color: #FFFFFF;" title="Visualizar na loja">
                  ${p.name} ↗
                </a>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${p.category_name || 'Sem categoria'}</div>
              </div>
            </div>
          </td>
          <td>
            <strong>${API.formatBRL(p.price)}</strong>
            ${p.cost_price ? `<div style="font-size: 0.72rem; color: var(--text-muted);">Custo: ${API.formatBRL(p.cost_price)}</div>` : ''}
          </td>
          <td>
            <span style="font-weight: 700; color: ${p.total_stock <= 3 ? '#ef4444' : '#10b981'};">
              ${p.total_stock} un
            </span>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${p.variant_count || 1} variações</div>
          </td>
          <td>
            <button 
              class="badge ${isDemo ? 'badge-demo' : 'badge-stock'}" 
              style="cursor: pointer; border: 1px solid currentColor;" 
              onclick="toggleProductDemo(${p.id})">
              ${isDemo ? '⚠️ Demonstrativo (Bloqueado)' : '✅ Liberado p/ Venda'}
            </button>
          </td>
          <td>
            <button 
              class="badge ${isActive ? 'badge-new' : 'badge-sale'}" 
              style="cursor: pointer;" 
              onclick="toggleProductActive(${p.id})">
              ${isActive ? 'Ativo na Loja' : 'Desativado'}
            </button>
          </td>
          <td>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-secondary btn-sm" onclick="openEditProductModal(${JSON.stringify(p).replace(/"/g, '&quot;')})">Editar</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Erro ao carregar produtos no admin:', err);
  }
}

async function toggleProductDemo(productId) {
  try {
    const res = await API.toggleProductDemo(productId);
    if (res.success) {
      if (window.UI) UI.showToast(res.message, 'success');
      loadAdminProducts();
    }
  } catch (err) {
    if (window.UI) UI.showToast(err.message, 'error');
  }
}

async function toggleProductActive(productId) {
  try {
    const res = await API.toggleProductActive(productId);
    if (res.success) {
      if (window.UI) UI.showToast(res.message, 'info');
      loadAdminProducts();
    }
  } catch (err) {
    if (window.UI) UI.showToast(err.message, 'error');
  }
}

// Abrir modal de novo produto
function openNewProductModal() {
  const modal = document.getElementById('productFormModal');
  const title = document.getElementById('modalProductTitle');
  const form = document.getElementById('productAdminForm');
  if (modal && form) {
    form.reset();
    document.getElementById('editProductId').value = '';
    if (title) title.textContent = 'Cadastrar Nova Peça Streetwear';
    modal.classList.add('active');
  }
}

function openEditProductModal(product) {
  const modal = document.getElementById('productFormModal');
  const title = document.getElementById('modalProductTitle');
  if (!modal) return;

  document.getElementById('editProductId').value = product.id;
  document.getElementById('prodName').value = product.name || '';
  document.getElementById('prodCategory').value = product.category_id || 1;
  document.getElementById('prodPrice').value = product.price || '';
  document.getElementById('prodComparePrice').value = product.compare_at_price || '';
  document.getElementById('prodCostPrice').value = product.cost_price || '';
  document.getElementById('prodSupplier').value = product.supplier_name || '';
  document.getElementById('prodImages').value = (product.images || []).join('\n');
  document.getElementById('prodDescription').value = product.description || '';
  document.getElementById('prodDetails').value = product.details || '';
  document.getElementById('prodIsDemo').checked = product.is_demo === 1;

  if (title) title.textContent = `Editar: ${product.name}`;
  modal.classList.add('active');
}

function closeProductModal() {
  const modal = document.getElementById('productFormModal');
  if (modal) modal.classList.remove('active');
}

async function handleProductFormSubmit(e) {
  if (e) e.preventDefault();

  const id = document.getElementById('editProductId').value;
  const name = document.getElementById('prodName').value.trim();
  const category_id = parseInt(document.getElementById('prodCategory').value, 10);
  const price = parseFloat(document.getElementById('prodPrice').value);
  const compare_at_price = document.getElementById('prodComparePrice').value ? parseFloat(document.getElementById('prodComparePrice').value) : null;
  const cost_price = document.getElementById('prodCostPrice').value ? parseFloat(document.getElementById('prodCostPrice').value) : 0;
  const supplier_name = document.getElementById('prodSupplier').value.trim();
  const rawImages = document.getElementById('prodImages').value.trim().split('\n').map(s => s.trim()).filter(Boolean);
  const description = document.getElementById('prodDescription').value.trim();
  const details = document.getElementById('prodDetails').value.trim();
  const is_demo = document.getElementById('prodIsDemo').checked ? 1 : 0;

  const payload = {
    name,
    category_id,
    price,
    compare_at_price,
    cost_price,
    supplier_name,
    images: rawImages.length > 0 ? rawImages : ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800'],
    description,
    details,
    is_demo
  };

  try {
    if (id) {
      await API.updateProduct(id, payload);
      if (window.UI) UI.showToast('Produto atualizado com sucesso!', 'success');
    } else {
      await API.createProduct(payload);
      if (window.UI) UI.showToast('Novo produto cadastrado com sucesso!', 'success');
    }
    closeProductModal();
    loadAdminProducts();
  } catch (err) {
    if (window.UI) UI.showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.startsWith('/admin')) {
    checkAdminAuth();

    // Formulário de Login
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) loginForm.addEventListener('submit', handleAdminLogin);

    // Dashboard
    if (document.getElementById('dashRevenue')) loadDashboard();

    // Pedidos
    if (document.getElementById('adminOrdersTable')) loadAdminOrders();

    // Produtos
    if (document.getElementById('adminProductsTable')) loadAdminProducts();

    // Formulário de Produto
    const prodForm = document.getElementById('productAdminForm');
    if (prodForm) prodForm.addEventListener('submit', handleProductFormSubmit);
  }
});
