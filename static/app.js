// Simple JavaScript for the trope database interface

class TropeApp {
    constructor() {
        this.currentView = 'tropes';
        this.data = {
            tropes: [],
            categories: [],
            works: [],
            examples: []
        };
        this.filteredData = {
            tropes: [],
            categories: [],
            works: [],
            examples: []
        };
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadData();
        this.setupControls();
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
    
    async loadData(sortBy = 'name', sortOrder = 'asc', filterCategory = '') {
        this.showLoading();
        
        try {
            // Build API URL with sorting and filtering parameters
            let tropeUrl = '/api/tropes';
            const params = new URLSearchParams();
            
            if (sortBy) params.append('sort', sortBy);
            if (sortOrder) params.append('order', sortOrder);
            if (filterCategory) params.append('filter_category', filterCategory);
            
            if (params.toString()) {
                tropeUrl += '?' + params.toString();
            }
            
            // Load tropes with filters and categories
            const [tropesResponse, categoriesResponse] = await Promise.all([
                fetch(tropeUrl),
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
            
            // Update results count
            this.updateResultsCount();
            
        } catch (error) {
            this.showError('Failed to load data. Please make sure the API server is running.');
            console.error('Error loading data:', error);
        }
    }
    
    updateResultsCount() {
        const countElement = document.getElementById('resultsCount');
        if (countElement) {
            const count = this.filteredData.tropes.length;
            countElement.textContent = `${count} trope${count !== 1 ? 's' : ''}`;
        }
    }
    
    setupControls() {
        // Populate category filter dropdown
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter && this.data.categories) {
            // Clear existing options (except "All Categories")
            categoryFilter.innerHTML = '<option value="">All Categories</option>';
            
            // Add category options
            this.data.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.display_name;
                categoryFilter.appendChild(option);
            });
        }
        
        // Setup event handlers
        const sortSelect = document.getElementById('sortSelect');
        const orderSelect = document.getElementById('orderSelect');
        
        if (sortSelect) {
            sortSelect.addEventListener('change', () => this.handleControlChange());
        }
        
        if (orderSelect) {
            orderSelect.addEventListener('change', () => this.handleControlChange());
        }
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.handleControlChange());
        }
    }
    
    async handleControlChange() {
        const sortSelect = document.getElementById('sortSelect');
        const orderSelect = document.getElementById('orderSelect');
        const categoryFilter = document.getElementById('categoryFilter');
        
        const sortBy = sortSelect ? sortSelect.value : 'name';
        const sortOrder = orderSelect ? orderSelect.value : 'asc';
        const filterCategory = categoryFilter ? categoryFilter.value : '';
        
        // Reload data with new parameters
        await this.loadData(sortBy, sortOrder, filterCategory);
        
        // Re-render tropes if we're on the tropes section
        if (document.getElementById('tropesSection').style.display !== 'none') {
            this.renderTropes();
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
                case 'works':
                    this.renderWorks();
                    break;
                case 'examples':
                    this.renderExamples();
                    break;
                case 'analytics':
                    this.renderAnalytics();
                    break;
                case 'create':
                    this.renderCreateForm();
                    break;
                case 'createWork':
                    this.renderCreateWorkForm();
                    break;
                case 'createExample':
                    this.renderCreateExampleForm();
                    break;
                case 'edit':
                    // Edit form is handled by editTrope method
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
                    <div class="item-card">
                        <div class="item-content" onclick="app.showTropeDetail('${trope.id}')">
                            <div class="item-title">${this.escapeHtml(trope.name)}</div>
                            <div class="item-description">
                                ${this.escapeHtml(trope.description || '').substring(0, 150)}${trope.description && trope.description.length > 150 ? '...' : ''}
                            </div>
                            <div class="item-meta">
                                ${trope.categories.map(cat => `<span class="tag category">${this.escapeHtml(cat)}</span>`).join('')}
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="action-btn action-edit" onclick="app.editTrope('${trope.id}'); event.stopPropagation();" aria-label="Edit trope">
                                ✏️
                            </button>
                            <button class="action-btn action-delete" onclick="app.deleteTrope('${trope.id}'); event.stopPropagation();" aria-label="Delete trope">
                                🗑️
                            </button>
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
    
    async renderAnalytics() {
        const container = document.getElementById('analyticsContent');
        container.innerHTML = '<div class="loading">Loading analytics...</div>';
        
        try {
            const response = await fetch('/api/analytics');
            if (!response.ok) {
                throw new Error('Failed to load analytics');
            }
            
            const analytics = await response.json();
            
            // Setup export button
            this.setupExportButton();
            
            // Render analytics content
            const html = `
                <div class="analytics-stats">
                    <div class="stat-card">
                        <span class="stat-number">${analytics.summary.total_tropes}</span>
                        <span class="stat-label">Total Tropes</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${analytics.summary.total_categories}</span>
                        <span class="stat-label">Categories</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${analytics.summary.avg_categories_per_trope}</span>
                        <span class="stat-label">Avg Categories per Trope</span>
                    </div>
                </div>
                
                <div class="category-chart">
                    <h4>🏆 Most Popular Categories</h4>
                    ${this.renderCategoryChart(analytics.popular_categories)}
                </div>
            `;
            
            container.innerHTML = html;
            
        } catch (error) {
            container.innerHTML = `<div class="error">Failed to load analytics: ${error.message}</div>`;
            console.error('Analytics error:', error);
        }
    }
    
    renderCategoryChart(categories) {
        if (!categories || categories.length === 0) {
            return '<div class="text-muted">No category data available.</div>';
        }
        
        const maxCount = categories[0].trope_count;
        
        return categories.map(category => `
            <div class="category-bar">
                <span class="category-name">${this.escapeHtml(category.name)}</span>
                <div class="category-progress">
                    <div class="category-progress-fill" style="width: ${(category.trope_count / maxCount) * 100}%"></div>
                </div>
                <span class="category-count">${category.trope_count}</span>
            </div>
        `).join('');
    }
    
    setupExportButton() {
        const exportBtn = document.getElementById('exportCsvBtn');
        if (exportBtn) {
            exportBtn.onclick = () => this.exportCsv();
        }
    }
    
    async exportCsv() {
        try {
            const exportBtn = document.getElementById('exportCsvBtn');
            if (exportBtn) {
                exportBtn.disabled = true;
                exportBtn.textContent = '⏳ Exporting...';
            }
            
            // Trigger download
            window.location.href = '/api/export/csv';
            
            // Reset button after delay
            setTimeout(() => {
                if (exportBtn) {
                    exportBtn.disabled = false;
                    exportBtn.textContent = '📥 Export CSV';
                }
            }, 2000);
            
        } catch (error) {
            console.error('Export error:', error);
            const exportBtn = document.getElementById('exportCsvBtn');
            if (exportBtn) {
                exportBtn.disabled = false;
                exportBtn.textContent = '❌ Export Failed';
                setTimeout(() => {
                    exportBtn.textContent = '📥 Export CSV';
                }, 3000);
            }
        }
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
    
    async editTrope(tropeId) {
        try {
            // Fetch the trope data
            const response = await fetch(`/api/tropes/${tropeId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch trope data');
            }
            
            const trope = await response.json();
            
            // Populate the edit form
            document.getElementById('editTropeId').value = trope.id;
            document.getElementById('editTropeName').value = trope.name;
            document.getElementById('editTropeDescription').value = trope.description;
            
            // Load categories and select current ones
            this.loadCategoriesIntoEditForm(trope.categories);
            
            // Setup form submission handler
            const form = document.getElementById('editTropeForm');
            if (form) {
                form.onsubmit = this.handleEditSubmit.bind(this);
            }
            
            // Show edit section
            this.showSection('edit');
            
        } catch (error) {
            console.error('Error loading trope for editing:', error);
            alert('Failed to load trope data for editing');
        }
    }
    
    loadCategoriesIntoEditForm(selectedCategories = []) {
        const container = document.getElementById('editCategorySelection');
        if (!container) {
            console.error('Edit category selection container not found');
            return;
        }
        
        if (!this.data.categories || this.data.categories.length === 0) {
            container.innerHTML = '<div class="text-muted">Loading categories...</div>';
            return;
        }
        
        // Get selected category IDs for checking
        const selectedCategoryIds = selectedCategories.map(cat => cat.id);
        
        const html = this.data.categories.map(category => {
            const isSelected = selectedCategoryIds.includes(category.id);
            return `
                <div class="category-checkbox">
                    <input type="checkbox" 
                           id="edit-cat-${category.id}" 
                           value="${category.display_name}" 
                           name="categories"
                           ${isSelected ? 'checked' : ''}>
                    <label for="edit-cat-${category.id}">${this.escapeHtml(category.display_name)}</label>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }
    
    async handleEditSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const feedback = document.getElementById('editFeedback');
        const submitButton = form.querySelector('button[type="submit"]');
        
        // Get form data
        const formData = new FormData(form);
        const tropeId = formData.get('tropeId');
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
        submitButton.textContent = 'Updating...';
        this.showFeedback(feedback, 'Updating trope...', 'loading');
        
        try {
            const response = await fetch(`/api/tropes/${tropeId}`, {
                method: 'PUT',
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
                this.showFeedback(feedback, `Trope "${name}" updated successfully!`, 'success');
                
                // Reload data to include updated trope
                await this.loadData();
                
                // Show success message for a bit, then switch to tropes view
                setTimeout(() => {
                    this.showSection('tropes');
                }, 2000);
                
            } else {
                // Server error
                this.showFeedback(feedback, result.error || 'Failed to update trope', 'error');
            }
            
        } catch (error) {
            console.error('Error updating trope:', error);
            this.showFeedback(feedback, 'Network error. Please check your connection.', 'error');
        } finally {
            // Reset button
            submitButton.disabled = false;
            submitButton.textContent = 'Update Trope';
        }
    }
    
    async deleteTrope(tropeId) {
        try {
            // Get trope name for confirmation
            const response = await fetch(`/api/tropes/${tropeId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch trope data');
            }
            
            const trope = await response.json();
            
            // Confirm deletion
            const confirmed = confirm(`Are you sure you want to delete the trope "${trope.name}"?\n\nThis action cannot be undone.`);
            
            if (!confirmed) {
                return;
            }
            
            // Delete the trope
            const deleteResponse = await fetch(`/api/tropes/${tropeId}`, {
                method: 'DELETE'
            });
            
            const result = await deleteResponse.json();
            
            if (deleteResponse.ok) {
                // Success! Reload data and show message
                await this.loadData();
                alert(`Trope "${trope.name}" has been deleted successfully.`);
            } else {
                // Error
                alert(`Failed to delete trope: ${result.error || 'Unknown error'}`);
            }
            
        } catch (error) {
            console.error('Error deleting trope:', error);
            alert('Failed to delete trope. Please check your connection.');
        }
    }

    // Render Works section
    renderWorks() {
        const worksGrid = document.getElementById('works-grid');
        const worksCount = document.getElementById('works-count');
        
        if (!worksGrid || !worksCount) return;

        worksCount.textContent = `${this.data.works.length} work${this.data.works.length === 1 ? '' : 's'}`;

        if (this.data.works.length === 0) {
            worksGrid.innerHTML = '<div class="no-data">No works found. Create your first work to get started!</div>';
            return;
        }

        worksGrid.innerHTML = this.data.works.map(work => `
            <div class="card work-card" data-work-id="${work.id}">
                <div class="card-header">
                    <h3 class="work-title">${this.escapeHtml(work.title)}</h3>
                    <div class="card-actions">
                        <button class="btn btn-small" onclick="app.editWork(${work.id})">✏️ Edit</button>
                        <button class="btn btn-danger btn-small" onclick="app.deleteWork(${work.id})">🗑️ Delete</button>
                    </div>
                </div>
                <div class="card-body">
                    <p class="work-description">${this.escapeHtml(work.description || 'No description provided.')}</p>
                    <div class="work-metadata">
                        <span class="work-type">${this.escapeHtml(work.type)}</span>
                        ${work.genre ? `<span class="work-genre">${this.escapeHtml(work.genre)}</span>` : ''}
                        ${work.status ? `<span class="work-status">${this.escapeHtml(work.status)}</span>` : ''}
                    </div>
                    <div class="examples-count">
                        ${this.data.examples.filter(ex => ex.work_id === work.id).length} trope examples
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Render Examples section
    renderExamples() {
        const examplesGrid = document.getElementById('examples-grid');
        const examplesCount = document.getElementById('examples-count');
        
        if (!examplesGrid || !examplesCount) return;

        examplesCount.textContent = `${this.data.examples.length} example${this.data.examples.length === 1 ? '' : 's'}`;

        if (this.data.examples.length === 0) {
            examplesGrid.innerHTML = '<div class="no-data">No examples found. Create your first trope-work connection!</div>';
            return;
        }

        examplesGrid.innerHTML = this.data.examples.map(example => {
            const trope = this.data.tropes.find(t => t.id === example.trope_id);
            const work = this.data.works.find(w => w.id === example.work_id);
            
            return `
                <div class="card example-card" data-example-id="${example.id}">
                    <div class="card-header">
                        <div class="example-connection">
                            <span class="trope-name">${this.escapeHtml(trope ? trope.name : 'Unknown Trope')}</span>
                            <span class="connection-arrow">→</span>
                            <span class="work-name">${this.escapeHtml(work ? work.title : 'Unknown Work')}</span>
                        </div>
                        <div class="card-actions">
                            <button class="btn btn-small" onclick="app.editExample(${example.id})">✏️ Edit</button>
                            <button class="btn btn-danger btn-small" onclick="app.deleteExample(${example.id})">🗑️ Delete</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <p class="example-description">${this.escapeHtml(example.description || 'No description provided.')}</p>
                        ${example.chapter_reference ? `<div class="chapter-reference">Chapter: ${this.escapeHtml(example.chapter_reference)}</div>` : ''}
                        ${example.notes ? `<div class="example-notes">Notes: ${this.escapeHtml(example.notes)}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Render Create Work Form
    renderCreateWorkForm() {
        document.getElementById('content').innerHTML = `
            <div class="section-header">
                <h1>Create New Work</h1>
                <button class="btn btn-secondary" onclick="app.showSection('works')">← Back to Works</button>
            </div>
            
            <form id="create-work-form" class="create-form">
                <div class="form-group">
                    <label for="work-title">Title *</label>
                    <input type="text" id="work-title" name="title" required maxlength="200">
                </div>
                
                <div class="form-group">
                    <label for="work-description">Description</label>
                    <textarea id="work-description" name="description" rows="4" maxlength="1000"></textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="work-type">Type</label>
                        <select id="work-type" name="type">
                            <option value="">Select type...</option>
                            <option value="Novel">Novel</option>
                            <option value="Short Story">Short Story</option>
                            <option value="Screenplay">Screenplay</option>
                            <option value="Play">Play</option>
                            <option value="Comic">Comic</option>
                            <option value="Game">Game</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="work-genre">Genre</label>
                        <input type="text" id="work-genre" name="genre" maxlength="100">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="work-status">Status</label>
                    <select id="work-status" name="status">
                        <option value="">Select status...</option>
                        <option value="Planning">Planning</option>
                        <option value="Writing">Writing</option>
                        <option value="Editing">Editing</option>
                        <option value="Complete">Complete</option>
                        <option value="Published">Published</option>
                        <option value="On Hold">On Hold</option>
                    </select>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Create Work</button>
                    <button type="button" class="btn btn-secondary" onclick="app.showSection('works')">Cancel</button>
                </div>
            </form>
        `;
        
        // Add form submission handler
        document.getElementById('create-work-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateWork(e.target);
        });
    }

    // Render Create Example Form
    renderCreateExampleForm() {
        const tropeOptions = this.data.tropes.map(trope => 
            `<option value="${trope.id}">${this.escapeHtml(trope.name)}</option>`
        ).join('');
        
        const workOptions = this.data.works.map(work => 
            `<option value="${work.id}">${this.escapeHtml(work.title)}</option>`
        ).join('');

        document.getElementById('content').innerHTML = `
            <div class="section-header">
                <h1>Create New Example</h1>
                <button class="btn btn-secondary" onclick="app.showSection('examples')">← Back to Examples</button>
            </div>
            
            <form id="create-example-form" class="create-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="example-trope">Trope *</label>
                        <select id="example-trope" name="trope_id" required>
                            <option value="">Select a trope...</option>
                            ${tropeOptions}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="example-work">Work *</label>
                        <select id="example-work" name="work_id" required>
                            <option value="">Select a work...</option>
                            ${workOptions}
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="example-description">Description *</label>
                    <textarea id="example-description" name="description" rows="4" required maxlength="1000" 
                              placeholder="Describe how this trope appears in this work..."></textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="example-chapter">Chapter/Section Reference</label>
                        <input type="text" id="example-chapter" name="chapter_reference" maxlength="100"
                               placeholder="e.g., Chapter 5, Act II, Scene 3">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="example-notes">Notes</label>
                    <textarea id="example-notes" name="notes" rows="3" maxlength="500"
                              placeholder="Additional notes about this example..."></textarea>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Create Example</button>
                    <button type="button" class="btn btn-secondary" onclick="app.showSection('examples')">Cancel</button>
                </div>
            </form>
        `;
        
        // Add form submission handler
        document.getElementById('create-example-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateExample(e.target);
        });
    }

    // Handle Work creation
    async handleCreateWork(form) {
        const formData = new FormData(form);
        const workData = {
            title: formData.get('title').trim(),
            description: formData.get('description').trim() || null,
            type: formData.get('type') || null,
            genre: formData.get('genre').trim() || null,
            status: formData.get('status') || null
        };

        try {
            const response = await fetch('/api/works', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(workData)
            });

            const result = await response.json();

            if (response.ok) {
                // Success! Reload data and show works section
                await this.loadData();
                this.showSection('works');
                alert(`Work "${workData.title}" has been created successfully!`);
            } else {
                // Error
                alert(`Failed to create work: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error creating work:', error);
            alert('Failed to create work. Please check your connection.');
        }
    }

    // Handle Example creation
    async handleCreateExample(form) {
        const formData = new FormData(form);
        const exampleData = {
            trope_id: parseInt(formData.get('trope_id')),
            work_id: parseInt(formData.get('work_id')),
            description: formData.get('description').trim(),
            chapter_reference: formData.get('chapter_reference').trim() || null,
            notes: formData.get('notes').trim() || null
        };

        try {
            const response = await fetch('/api/examples', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(exampleData)
            });

            const result = await response.json();

            if (response.ok) {
                // Success! Reload data and show examples section
                await this.loadData();
                this.showSection('examples');
                alert('Example has been created successfully!');
            } else {
                // Error
                alert(`Failed to create example: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error creating example:', error);
            alert('Failed to create example. Please check your connection.');
        }
    }

    // Edit and Delete methods for Works and Examples
    async editWork(workId) {
        // TODO: Implement edit work functionality
        alert('Edit work functionality coming soon!');
    }

    async deleteWork(workId) {
        const work = this.data.works.find(w => w.id === workId);
        if (!work) return;

        if (!confirm(`Are you sure you want to delete the work "${work.title}"?\n\nThis will also delete all examples associated with this work.`)) {
            return;
        }

        try {
            const deleteResponse = await fetch(`/api/works/${workId}`, {
                method: 'DELETE'
            });
            
            const result = await deleteResponse.json();
            
            if (deleteResponse.ok) {
                // Success! Reload data and show message
                await this.loadData();
                alert(`Work "${work.title}" has been deleted successfully.`);
            } else {
                // Error
                alert(`Failed to delete work: ${result.error || 'Unknown error'}`);
            }
            
        } catch (error) {
            console.error('Error deleting work:', error);
            alert('Failed to delete work. Please check your connection.');
        }
    }

    async editExample(exampleId) {
        // TODO: Implement edit example functionality
        alert('Edit example functionality coming soon!');
    }

    async deleteExample(exampleId) {
        const example = this.data.examples.find(e => e.id === exampleId);
        if (!example) return;

        const trope = this.data.tropes.find(t => t.id === example.trope_id);
        const work = this.data.works.find(w => w.id === example.work_id);

        if (!confirm(`Are you sure you want to delete this example?\n\nTrope: ${trope?.name || 'Unknown'}\nWork: ${work?.title || 'Unknown'}`)) {
            return;
        }

        try {
            const deleteResponse = await fetch(`/api/examples/${exampleId}`, {
                method: 'DELETE'
            });
            
            const result = await deleteResponse.json();
            
            if (deleteResponse.ok) {
                // Success! Reload data and show message
                await this.loadData();
                alert('Example has been deleted successfully.');
            } else {
                // Error
                alert(`Failed to delete example: ${result.error || 'Unknown error'}`);
            }
            
        } catch (error) {
            console.error('Error deleting example:', error);
            alert('Failed to delete example. Please check your connection.');
        }
    }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TropeApp();
});
