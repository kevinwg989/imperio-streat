// Lógica da Página Inicial - IMPÉRIO STREETWEAR

function renderProductCardHTML(p) {
  const isDemo = p.is_demo === 1;
  const isNew = p.is_new === 1;
  const primaryImg = p.primary_image || (p.images && p.images[0]) || '/assets/images/placeholder.svg';

  return `
    <div class="product-card">
      <div class="card-badges">
        ${isDemo ? '<span class="badge badge-demo">Demonstrativo / Catálogo</span>' : ''}
        ${!isDemo && isNew ? '<span class="badge badge-new">Drop Novo</span>' : ''}
        ${p.compare_at_price ? '<span class="badge badge-sale">Oferta</span>' : ''}
      </div>

      <a href="/produto/${p.slug}" class="card-thumb-link">
        <img src="${primaryImg}" alt="${p.name}" loading="lazy">
      </a>

      <div class="card-content">
        <span class="card-category">${p.category_name || 'Streetwear'}</span>
        <a href="/produto/${p.slug}">
          <h3 class="card-title">${p.name}</h3>
        </a>

        <div class="card-pricing">
          <span class="current-price">${API.formatBRL(p.price)}</span>
          ${p.compare_at_price ? `<span class="old-price">${API.formatBRL(p.compare_at_price)}</span>` : ''}
        </div>

        <div class="card-footer-action">
          <a href="/produto/${p.slug}" class="btn btn-outline btn-sm btn-block">
            ${isDemo ? 'Ver Detalhes (Amostra)' : 'Escolher Tamanho'}
          </a>
        </div>
      </div>
    </div>
  `;
}

async function loadHomeContent() {
  try {
    // 1. Carregar Categorias
    const catContainer = document.getElementById('homeCategoriesGrid');
    if (catContainer) {
      const res = await API.getCategories();
      if (res.success && res.data) {
        catContainer.innerHTML = res.data.map(cat => `
          <a href="/catalogo?category=${cat.slug}" class="category-card">
            <img src="${cat.image_url}" alt="${cat.name}" loading="lazy">
            <div class="category-overlay">
              <h4>${cat.name}</h4>
              <span>${cat.product_count || 0} produtos • Explorar →</span>
            </div>
          </a>
        `).join('');
      }
    }

    // 2. Carregar Destaques (Featured)
    const featuredContainer = document.getElementById('homeFeaturedGrid');
    if (featuredContainer) {
      const res = await API.getProducts({ featured: '1', limit: 4 });
      if (res.success && res.data) {
        featuredContainer.innerHTML = res.data.map(renderProductCardHTML).join('');
      }
    }

    // 3. Carregar Lançamentos
    const newArrivalsContainer = document.getElementById('homeNewGrid');
    if (newArrivalsContainer) {
      const res = await API.getProducts({ limit: 4, sort: 'newest' });
      if (res.success && res.data) {
        newArrivalsContainer.innerHTML = res.data.map(renderProductCardHTML).join('');
      }
    }
  } catch (err) {
    console.error('Erro ao carregar conteúdo da página inicial:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('homeCategoriesGrid') || document.getElementById('homeFeaturedGrid')) {
    loadHomeContent();
  }
});
