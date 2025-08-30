// Simple JavaScript for the trope database interface

class TropeApp {
    constructor() {
        this.currentView = 'tropes';
        this.data = {
            tropes: [],
            categories: []
        };
        this.filteredData = {
            tropes: [],
            categories: []
        };
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadData();
        this.showSection('tropes');
    }
    
    setupEventListeners() {
        // Navigation buttons
        document.querySelectorAll('.nav button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.dataset.section;
                this.showSection(section);
            });
        });
        
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
        
        // Back button (will be added dynamically)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('back-button')) {
                this.showSection(this.currentView);
            }
        });
    }
    
    async loadData() {
        this.showLoading();
        
        try {
            // Load tropes and categories
            const [tropesResponse, categoriesResponse] = await Promise.all([
                fetch('/api/tropes'),
                fetch('/api/categories')
            ]);
            
            if (!tropesResponse.ok || !categoriesResponse.ok) {
                throw new Error('Failed to load data from API');
            }
            
            const tropesData = await tropesResponse.json();
            const categoriesData = await categoriesResponse.json();
            
            this.data.tropes = tropesData.tropes || [];
            this.data.categories = categoriesData.categories || [];
            
            this.filteredData.tropes = [...this.data.tropes];
            this.filteredData.categories = [...this.data.categories];
            
        } catch (error) {
            this.showError('Failed to load data. Please make sure the API server is running.');
            console.error('Error loading data:', error);
        }
    }
    
    showSection(section) {
        try {
            // Hide all sections
            document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
            
            // Show requested section
            const targetSection = document.getElementById(section + 'Section');
            if (targetSection) {
                targetSection.style.display = 'block';
            } else {
                console.error(`Section ${section}Section not found`);
                return;
            }
            
            // Update active navigation - remove active class from all nav buttons
            document.querySelectorAll('.nav button').forEach(btn => btn.classList.remove('active'));
            
            // Add active class to the current section button
            const activeButton = document.querySelector(`.nav button[data-section="${section}"]`);
            if (activeButton) {
                activeButton.classList.add('active');
            }
            
            // Handle section-specific logic
            switch (section) {
                case 'tropes':
                    this.renderTropes();
                    break;
                case 'categories':
                    this.renderCategories();
                    break;
                case 'create':
                    this.renderCreateForm();
                    break;
            }
        } catch (error) {
            console.error('Error in showSection:', error);
        }
    }
    
    renderTropes() {
        const container = document.getElementById('tropesContent');
        
        if (this.filteredData.tropes.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">No tropes found.</div>';
            return;
        }
        
        const html = `
            <div class="items-grid">
                ${this.filteredData.tropes.map(trope => `
                    <div class="item-card" onclick="app.showTropeDetail('${trope.id}')">
                        <div class="item-title">${this.escapeHtml(trope.name)}</div>
                        <div class="item-description">
                            ${this.escapeHtml(trope.description || '').substring(0, 150)}${trope.description && trope.description.length > 150 ? '...' : ''}
                        </div>
                        <div class="item-meta">
                            ${trope.categories.map(cat => `<span class="tag category">${this.escapeHtml(cat)}</span>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = html;
    }
    
    renderCategories() {
        const container = document.getElementById('categoriesContent');
        
        if (this.filteredData.categories.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">No categories found.</div>';
            return;
        }
        
        const html = `
            <div class="items-grid">
                ${this.filteredData.categories.map(category => `
                    <div class="item-card" onclick="app.showCategoryDetail('${category.id}')">
                        <div class="item-title">${this.escapeHtml(category.display_name || category.name)}</div>
                        <div class="item-meta">
                            <span class="count">${category.trope_count} tropes</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = html;
    }
    
    async showTropeDetail(tropeId) {
        this.showLoading();
        
        try {
            const response = await fetch(`/api/tropes/${tropeId}`);
            if (!response.ok) {
                throw new Error('Trope not found');
            }
            
            const trope = await response.json();
            
            const html = `
                <div class="item-detail">
                    <button class="back-button">← Back to Tropes</button>
                    <div class="detail-header">
                        <h2 class="detail-title">${this.escapeHtml(trope.name)}</h2>
                        <div class="detail-description">${this.escapeHtml(trope.description || 'No description available.')}</div>
                    </div>
                    <div class="detail-section">
                        <h3>Categories</h3>
                        <div class="item-meta">
                            ${trope.categories.map(cat => `<span class="tag category">${this.escapeHtml(cat.name)}</span>`).join('')}
                            ${trope.categories.length === 0 ? '<span class="text-muted">No categories assigned</span>' : ''}
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('tropesContent').innerHTML = html;
            
        } catch (error) {
            this.showError('Failed to load trope details.');
            console.error('Error loading trope details:', error);
        }
    }
    
    async showCategoryDetail(categoryId) {
        this.showLoading();
        
        try {
            const response = await fetch(`/api/categories/${categoryId}/tropes`);
            if (!response.ok) {
                throw new Error('Category not found');
            }
            
            const data = await response.json();
            
            const html = `
                <div class="item-detail">
                    <button class="back-button">← Back to Categories</button>
                    <div class="detail-header">
                        <h2 class="detail-title">${this.escapeHtml(data.category.display_name || data.category.name)}</h2>
                        <p class="text-muted">${data.trope_count} tropes in this category</p>
                    </div>
                    <div class="detail-section">
                        <h3>Tropes in this Category</h3>
                        ${data.tropes.length > 0 ? `
                            <div class="items-grid">
                                ${data.tropes.map(trope => `
                                    <div class="item-card" onclick="app.showTropeDetail('${trope.id}')">
                                        <div class="item-title">${this.escapeHtml(trope.name)}</div>
                                        <div class="item-description">
                                            ${this.escapeHtml(trope.description || '').substring(0, 150)}${trope.description && trope.description.length > 150 ? '...' : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="text-muted">No tropes in this category.</p>'}
                    </div>
                </div>
            `;
            
            document.getElementById('categoriesContent').innerHTML = html;
            
        } catch (error) {
            this.showError('Failed to load category details.');
            console.error('Error loading category details:', error);
        }
    }
    
    async handleSearch(query) {
        const searchTerm = query.trim();
        
        if (searchTerm === '') {
            // Reset to original data
            this.filteredData.tropes = [...this.data.tropes];
            this.filteredData.categories = [...this.data.categories];
            this.updateSearchResults('');
        } else {
            // Use the new search API endpoint
            try {
                const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
                if (!response.ok) {
                    throw new Error('Search failed');
                }
                
                const searchResults = await response.json();
                this.filteredData.tropes = searchResults.tropes;
                this.filteredData.categories = searchResults.categories;
                this.updateSearchResults(searchTerm, searchResults.total_results);
            } catch (error) {
                console.error('Search error:', error);
                // Fallback to client-side search
                this.clientSideSearch(searchTerm);
            }
        }
        
        // Re-render current view
        if (this.currentView === 'tropes') {
            this.renderTropes();
        } else if (this.currentView === 'categories') {
            this.renderCategories();
        }
    }
    
    clientSideSearch(searchTerm) {
        // Fallback client-side search (original functionality)
        const normalizedSearch = searchTerm.toLowerCase().replace(/_/g, ' ');
        
        this.filteredData.tropes = this.data.tropes.filter(trope => 
            trope.name.toLowerCase().includes(normalizedSearch) ||
            (trope.description && trope.description.toLowerCase().includes(normalizedSearch)) ||
            trope.categories.some(cat => 
                cat.toLowerCase().replace(/_/g, ' ').includes(normalizedSearch)
            )
        );
        
        this.filteredData.categories = this.data.categories.filter(category => {
            const displayName = category.display_name || category.name || '';
            return displayName.toLowerCase().includes(normalizedSearch) ||
                   category.name.toLowerCase().replace(/_/g, ' ').includes(normalizedSearch);
        });
        
        const totalResults = this.filteredData.tropes.length + this.filteredData.categories.length;
        this.updateSearchResults(searchTerm, totalResults);
    }
    
    updateSearchResults(query, totalResults = null) {
        const resultsElement = document.getElementById('searchResults');
        if (!resultsElement) return;
        
        if (query === '') {
            resultsElement.textContent = '';
        } else {
            if (totalResults !== null) {
                resultsElement.textContent = `Found ${totalResults} results for "${query}"`;
            } else {
                const tropeCount = this.filteredData.tropes.length;
                const categoryCount = this.filteredData.categories.length;
                const total = tropeCount + categoryCount;
                resultsElement.textContent = `Found ${total} results (${tropeCount} tropes, ${categoryCount} categories)`;
            }
        }
    }
    
    showLoading() {
        const currentContent = this.currentView === 'tropes' ? 
            document.getElementById('tropesContent') : 
            document.getElementById('categoriesContent');
        
        if (currentContent) {
            currentContent.innerHTML = '<div class="loading">Loading...</div>';
        }
    }
    
    showError(message) {
        const currentContent = this.currentView === 'tropes' ? 
            document.getElementById('tropesContent') : 
            document.getElementById('categoriesContent');
        
        if (currentContent) {
            currentContent.innerHTML = `<div class="error">${this.escapeHtml(message)}</div>`;
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    renderCreateForm() {
        try {
            // Load categories into the form
            this.loadCategoriesIntoForm();
            
            // Setup form submission handler
            const form = document.getElementById('createTropeForm');
            if (form) {
                form.onsubmit = this.handleCreateSubmit.bind(this);
            } else {
                console.error('Create form not found');
            }
        } catch (error) {
            console.error('Error in renderCreateForm:', error);
        }
    }
    
    loadCategoriesIntoForm() {
        const container = document.getElementById('categorySelection');
        if (!container) {
            console.error('Category selection container not found');
            return;
        }
        
        if (!this.data.categories || this.data.categories.length === 0) {
            container.innerHTML = '<div class="text-muted">Loading categories...</div>';
            return;
        }
        
        const html = this.data.categories.map(category => `
            <div class="category-checkbox">
                <input type="checkbox" id="cat-${category.id}" value="${category.display_name}" name="categories">
                <label for="cat-${category.id}">${this.escapeHtml(category.display_name)}</label>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }
    
    async handleCreateSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const feedback = document.getElementById('createFeedback');
        const submitButton = form.querySelector('button[type="submit"]');
        
        // Get form data
        const formData = new FormData(form);
        const name = formData.get('name').trim();
        const description = formData.get('description').trim();
        
        // Get selected categories
        const selectedCategories = Array.from(form.querySelectorAll('input[name="categories"]:checked'))
            .map(checkbox => checkbox.value);
        
        // Validate
        const validation = this.validateCreateForm(name, description);
        if (!validation.valid) {
            this.showFeedback(feedback, validation.message, 'error');
            return;
        }
        
        // Show loading
        submitButton.disabled = true;
        submitButton.textContent = 'Creating...';
        this.showFeedback(feedback, 'Creating trope...', 'loading');
        
        try {
            const response = await fetch('/api/tropes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    description: description,
                    categories: selectedCategories
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Success!
                this.showFeedback(feedback, `Trope "${name}" created successfully!`, 'success');
                
                // Reset form
                form.reset();
                
                // Reload data to include new trope
                await this.loadData();
                
                // Show success message for a bit, then switch to tropes view
                setTimeout(() => {
                    this.showSection('tropes');
                }, 2000);
                
            } else {
                // Server error
                this.showFeedback(feedback, result.error || 'Failed to create trope', 'error');
            }
            
        } catch (error) {
            console.error('Error creating trope:', error);
            this.showFeedback(feedback, 'Network error. Please check your connection.', 'error');
        } finally {
            // Reset button
            submitButton.disabled = false;
            submitButton.textContent = 'Create Trope';
        }
    }
    
    validateCreateForm(name, description) {
        if (!name || name.length < 2) {
            return { valid: false, message: 'Name must be at least 2 characters long.' };
        }
        if (name.length > 200) {
            return { valid: false, message: 'Name must be less than 200 characters.' };
        }
        if (!description || description.length < 10) {
            return { valid: false, message: 'Description must be at least 10 characters long.' };
        }
        if (description.length > 2000) {
            return { valid: false, message: 'Description must be less than 2000 characters.' };
        }
        return { valid: true };
    }
    
    showFeedback(element, message, type) {
        if (!element) return;
        
        element.textContent = message;
        element.className = `feedback ${type}`;
        element.style.display = 'block';
    }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TropeApp();
});
