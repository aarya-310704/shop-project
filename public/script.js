// Global State Management
const AppState = {
  user: null,
  cart: JSON.parse(localStorage.getItem('cart')) || [],
  isLoggedIn: false,
  
  // Save cart to localStorage
  saveCart() {
    localStorage.setItem('cart', JSON.stringify(this.cart));
  },
  
  // Add item to cart
  addToCart(product) {
    const existingItem = this.cart.find(item => item.id === product.id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      this.cart.push({ ...product, quantity: 1 });
    }
    this.saveCart();
    this.updateCartUI();
    this.showNotification('Product added to cart!', 'success');
  },
  
  // Remove item from cart
  removeFromCart(productId) {
    this.cart = this.cart.filter(item => item.id !== productId);
    this.saveCart();
    this.updateCartUI();
    this.showNotification('Product removed from cart!', 'success');
  },
  
  // Update quantity
  updateQuantity(productId, quantity) {
    const item = this.cart.find(item => item.id === productId);
    if (item) {
      item.quantity = Math.max(1, quantity);
      this.saveCart();
      this.updateCartUI();
    }
  },
  
  // Get cart total
  getCartTotal() {
    return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  },
  
  // Update cart UI elements
  updateCartUI() {
    const cartCount = document.querySelector('.cart-count');
    const cartItems = document.querySelector('.cart-items');
    const cartTotal = document.querySelector('.cart-total');
    
    if (cartCount) {
      const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
      cartCount.textContent = totalItems;
      cartCount.style.display = totalItems > 0 ? 'block' : 'none';
    }
    
    if (cartItems) {
      this.renderCartItems();
    }
    
    if (cartTotal) {
      cartTotal.textContent = `$${this.getCartTotal().toFixed(2)}`;
    }
  },
  
  // Show notification
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification fade-in`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '1000';
    notification.style.minWidth = '300px';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  },
  
  // Render cart items
  renderCartItems() {
    const cartItems = document.querySelector('.cart-items');
    if (!cartItems) return;
    
    if (this.cart.length === 0) {
      cartItems.innerHTML = '<p class="text-center text-muted">Your cart is empty</p>';
      return;
    }
    
    cartItems.innerHTML = this.cart.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-image">📦</div>
        <div class="cart-item-details">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-price">$${item.price.toFixed(2)}</div>
          <div class="quantity-controls">
            <button class="quantity-btn" onclick="AppState.updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
            <input type="number" class="quantity-input" value="${item.quantity}" min="1" 
                   onchange="AppState.updateQuantity(${item.id}, parseInt(this.value))">
            <button class="quantity-btn" onclick="AppState.updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="AppState.removeFromCart(${item.id})">Remove</button>
      </div>
    `).join('');
  }
};

// API Service
const ApiService = {
  baseURL: '/api',
  
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };
    
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Auth endpoints
  async login(email, password) {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },
  
  async register(userData) {
    return this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },
  
  async resetPassword(email) {
    return this.makeRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },
  
  // Product endpoints
  async getProducts() {
    return this.makeRequest('/products');
  },
  
  async getProduct(id) {
    return this.makeRequest(`/products/${id}`);
  },
  
  // Order endpoints
  async createOrder(orderData) {
    return this.makeRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },
  
  // User endpoints
  async getProfile() {
    return this.makeRequest('/user/profile');
  },
  
  async updateProfile(userData) {
    return this.makeRequest('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }
};

// Form Validation
const FormValidator = {
  rules: {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    name: /^[a-zA-Z\s]{2,}$/,
    phone: /^\+?[\d\s-()]{10,}$/
  },
  
  validate(field, value) {
    const errors = [];
    
    switch (field) {
      case 'email':
        if (!value) errors.push('Email is required');
        else if (!this.rules.email.test(value)) errors.push('Invalid email format');
        break;
        
      case 'password':
        if (!value) errors.push('Password is required');
        else if (value.length < 8) errors.push('Password must be at least 8 characters');
        else if (!this.rules.password.test(value)) {
          errors.push('Password must contain uppercase, lowercase, and number');
        }
        break;
        
      case 'confirmPassword':
        const password = document.querySelector('input[name="password"]')?.value;
        if (!value) errors.push('Please confirm password');
        else if (value !== password) errors.push('Passwords do not match');
        break;
        
      case 'name':
        if (!value) errors.push('Name is required');
        else if (!this.rules.name.test(value)) errors.push('Invalid name format');
        break;
        
      case 'phone':
        if (value && !this.rules.phone.test(value)) errors.push('Invalid phone format');
        break;
    }
    
    return errors;
  },
  
  validateForm(formElement) {
    const inputs = formElement.querySelectorAll('input[required], input[data-validate]');
    let isValid = true;
    
    inputs.forEach(input => {
      const errors = this.validate(input.name, input.value);
      const errorElement = input.parentNode.querySelector('.form-error');
      
      if (errors.length > 0) {
        isValid = false;
        input.classList.add('error');
        if (errorElement) {
          errorElement.textContent = errors[0];
          errorElement.style.display = 'block';
        }
      } else {
        input.classList.remove('error');
        if (errorElement) {
          errorElement.style.display = 'none';
        }
      }
    });
    
    return isValid;
  },
  
  setupRealTimeValidation(formElement) {
    const inputs = formElement.querySelectorAll('input');
    
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        const errors = this.validate(input.name, input.value);
        const errorElement = input.parentNode.querySelector('.form-error');
        
        if (errors.length > 0) {
          input.classList.add('error');
          if (errorElement) {
            errorElement.textContent = errors[0];
            errorElement.style.display = 'block';
          }
        } else {
          input.classList.remove('error');
          if (errorElement) {
            errorElement.style.display = 'none';
          }
        }
      });
    });
  }
};

// Loading States
const LoadingManager = {
  show(element, text = 'Loading...') {
    element.disabled = true;
    element.innerHTML = `<div class="loading"><div class="spinner"></div> ${text}</div>`;
  },
  
  hide(element, originalText) {
    element.disabled = false;
    element.innerHTML = originalText;
  }
};

// Mobile Menu Toggle
function toggleMobileMenu() {
  const nav = document.querySelector('.nav');
  nav.classList.toggle('open');
}

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', function() {
  // Update cart UI on page load
  AppState.updateCartUI();
  
  // Setup mobile menu
  const mobileToggle = document.querySelector('.mobile-menu-toggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', toggleMobileMenu);
  }
  
  // Setup form validation for all forms
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    FormValidator.setupRealTimeValidation(form);
    
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      if (!FormValidator.validateForm(form)) {
        AppState.showNotification('Please fix the errors in the form', 'error');
        return;
      }
      
      // Handle form submission based on form type
      const formType = form.dataset.type;
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      
      LoadingManager.show(submitBtn);
      
      try {
        await handleFormSubmission(formType, new FormData(form));
        AppState.showNotification('Form submitted successfully!', 'success');
      } catch (error) {
        AppState.showNotification(error.message, 'error');
      } finally {
        LoadingManager.hide(submitBtn, originalText);
      }
    });
  });
  
  // Setup add to cart buttons
  document.addEventListener('click', function(e) {
    if (e.target.matches('.add-to-cart')) {
      const productCard = e.target.closest('.product-card');
      const product = {
        id: parseInt(productCard.dataset.id),
        name: productCard.querySelector('.product-title').textContent,
        price: parseFloat(productCard.querySelector('.product-price').textContent.replace('$', ''))
      };
      AppState.addToCart(product);
    }
  });
});

// Handle different form submissions
async function handleFormSubmission(formType, formData) {
  const data = Object.fromEntries(formData);
  
  switch (formType) {
    case 'login':
      const loginResult = await ApiService.login(data.email, data.password);
      localStorage.setItem('authToken', loginResult.token);
      AppState.user = loginResult.user;
      AppState.isLoggedIn = true;
      setTimeout(() => window.location.href = 'home.html', 1000);
      break;
      
    case 'register':
      await ApiService.register(data);
      setTimeout(() => window.location.href = 'login.html', 1000);
      break;
      
    case 'reset-password':
      await ApiService.resetPassword(data.email);
      break;
      
    case 'checkout':
      const order = {
        items: AppState.cart,
        shipping: data,
        total: AppState.getCartTotal()
      };
      const orderResult = await ApiService.createOrder(order);
      localStorage.setItem('lastOrder', JSON.stringify(orderResult));
      AppState.cart = [];
      AppState.saveCart();
      setTimeout(() => window.location.href = 'order_successful.html', 1000);
      break;
      
    case 'profile':
      await ApiService.updateProfile(data);
      break;
  }
}

// Mock data for demonstration
const mockProducts = [
  { id: 1, name: 'Wireless Headphones', price: 99.99, description: 'High-quality wireless headphones with noise cancellation.' },
  { id: 2, name: 'Smart Watch', price: 299.99, description: 'Feature-rich smartwatch with health tracking.' },
  { id: 3, name: 'Laptop Stand', price: 49.99, description: 'Adjustable aluminum laptop stand for ergonomic working.' },
  { id: 4, name: 'USB-C Hub', price: 79.99, description: 'Multi-port USB-C hub with HDMI, USB 3.0, and charging.' },
  { id: 5, name: 'Wireless Mouse', price: 39.99, description: 'Ergonomic wireless mouse with precision tracking.' },
  { id: 6, name: 'Mechanical Keyboard', price: 149.99, description: 'RGB mechanical keyboard with custom switches.' }
];

// Load products for product page
function loadProducts() {
  const productGrid = document.querySelector('.product-grid');
  if (!productGrid) return;
  
  productGrid.innerHTML = mockProducts.map(product => `
    <div class="product-card" data-id="${product.id}">
      <div class="product-image">📦</div>
      <div class="product-info">
        <div class="product-title">${product.name}</div>
        <div class="product-price">$${product.price}</div>
        <div class="product-description">${product.description}</div>
        <button class="btn btn-primary add-to-cart">Add to Cart</button>
      </div>
    </div>
  `).join('');
}

// Initialize products on product page
if (window.location.pathname.includes('product.html')) {
  document.addEventListener('DOMContentLoaded', loadProducts);
}