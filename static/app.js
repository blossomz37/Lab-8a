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
        
        // Network and status monitoring - simple
        this.statusCheckTime = null;
        this.statusTimer = null;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.setupStatusIndicator();
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
        
        // Create Work button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'createWorkBtn') {
                this.showSection('createWork');
            }
        });
        
                // Create Example button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'createExampleBtn') {
                this.showSection('createExample');
            }
        });

        // Export buttons
        document.addEventListener('click', (e) => {
            if (e.target.id === 'exportTropesBtn') {
                this.exportData('tropes');
            } else if (e.target.id === 'exportCategoriesBtn') {
                this.exportData('categories');
            } else if (e.target.id === 'exportWorksBtn') {
                this.exportData('works');
            } else if (e.target.id === 'exportExamplesBtn') {
                this.exportData('examples');
            }
        });
        
        // Back button (will be added dynamically)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('back-button')) {
                this.showSection(this.currentView);
            }
        });
    }
    
    // ================================
    // Status Monitoring System
    // ================================
    
    initializeStatusMonitoring() {
        // Set up online/offline event listeners
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateStatus('connecting', 'Connection restored, checking server...');
            this.checkServerHealth();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateStatus('disconnected', 'No internet connection');
            this.clearHealthCheckInterval();
        });
        
        // Initial status check
        this.updateStatus('connecting', 'Initializing...');
        this.checkServerHealth();
        
        // Set up periodic health checks (every 30 seconds)
        this.healthCheckInterval = setInterval(() => {
            if (this.isOnline && this.requestQueue.size === 0) {
                this.checkServerHealth(true); // Silent check
            }
        }, 30000);
    }
    
    async checkServerHealth(silent = false) {
        if (!this.isOnline) {
            this.updateStatus('disconnected', 'Offline');
            return false;
        }
        
        if (!silent) {
            this.updateStatus('connecting', 'Checking server...');
        }
        
        try {
            const startTime = performance.now();
            
            // Create timeout handling for better browser compatibility
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('/api', {
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache' },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);
            
            if (response.ok) {
                const data = await response.json();
                this.lastHealthCheck = {
                    timestamp: new Date(),
                    responseTime: responseTime,
                    databaseStats: data.database_info
                };
                
                const statusText = `Connected (${responseTime}ms)`;
                const details = `${data.database_info.tropes}T | ${data.database_info.categories}C | ${data.database_info.works}W | ${data.database_info.examples}E`;
                
                this.updateStatus('connected', statusText, details);
                this.serverStatus = 'connected';
                return true;
            } else {
                throw new Error(`Server responded with ${response.status}`);
            }
        } catch (error) {
            console.warn('Health check failed:', error.message);
            this.updateStatus('disconnected', 'Server unavailable', error.message);
            this.serverStatus = 'disconnected';
            return false;
        }
    }
    
    updateStatus(status, text, details = '') {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        const statusDetails = document.getElementById('statusDetails');
        
        if (statusDot && statusText && statusDetails) {
            // Remove all status classes
            statusDot.classList.remove('connected', 'connecting', 'disconnected');
            statusDot.classList.add(status);
            
            statusText.textContent = text;
            statusDetails.textContent = details;
        }
    }
    
    clearHealthCheckInterval() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
    
    // Enhanced fetch wrapper with status tracking
    async fetchWithStatus(url, options = {}) {
        const requestId = Date.now() + Math.random();
        this.requestQueue.add(requestId);
        
        try {
            // Show loading state for user-initiated requests
            if (!options.silent) {
                this.updateStatus('connecting', 'Loading...');
            }
            
            // Create timeout for better browser compatibility
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);
            
            const response = await fetch(url, {
                ...options,
                signal: options.signal || controller.signal
            });
            
            clearTimeout(timeoutId);
            
            this.requestQueue.delete(requestId);
            
            if (response.ok) {
                // Update to connected if we weren't already
                if (this.serverStatus !== 'connected') {
                    this.checkServerHealth(true);
                }
                return response;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            this.requestQueue.delete(requestId);
            
            if (error.name === 'TimeoutError') {
                this.updateStatus('connecting', 'Request timeout', 'Server is slow to respond');
            } else if (error.name === 'TypeError') {
                this.updateStatus('disconnected', 'Connection failed', 'Cannot reach server');
            } else {
                this.updateStatus('disconnected', 'Request failed', error.message);
            }
            
            throw error;
        }
    }
    
    // ================================
    // End Status Monitoring System
    // ================================
    
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
            
            // Load tropes, categories, works, and examples
            const [tropesResponse, categoriesResponse, worksResponse, examplesResponse] = await Promise.all([
                fetch(tropeUrl),
                fetch('/api/categories'),
                fetch('/api/works'),
                fetch('/api/examples')
            ]);
            
            if (!tropesResponse.ok || !categoriesResponse.ok || !worksResponse.ok || !examplesResponse.ok) {
                throw new Error('Failed to load data from API');
            }
            
            const tropesData = await tropesResponse.json();
            const categoriesData = await categoriesResponse.json();
            const worksData = await worksResponse.json();
            const examplesData = await examplesResponse.json();
            
            this.data.tropes = tropesData.tropes || [];
            this.data.categories = categoriesData.categories || [];
            this.data.works = worksData.works || [];
            this.data.examples = examplesData.examples || [];
            
            this.filteredData.tropes = [...this.data.tropes];
            this.filteredData.categories = [...this.data.categories];
            this.filteredData.works = [...this.data.works];
            this.filteredData.examples = [...this.data.examples];
            
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
            // Store current view
            this.currentView = section;
            
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
            
            // Update search placeholder based on section
            this.updateSearchPlaceholder(section);

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
                case 'editWork':
                    this.renderEditWorkForm();
                    break;
                case 'editExample':
                    this.renderEditExampleForm();
                    break;
                case 'edit':
                    // Edit form is handled by editTrope method
                    break;
            }

            // Scroll to top for edit forms to improve visibility
            if (['editWork', 'editExample', 'createWork', 'createExample'].includes(section)) {
                setTimeout(() => {
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                }, 100);
            }
        } catch (error) {
            console.error('Error in showSection:', error);
        }
    }
    
    updateSearchPlaceholder(section) {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;
        
        const placeholders = {
            'tropes': 'Search tropes, descriptions, or categories...',
            'categories': 'Search categories...',
            'works': 'Search works by title, author, or description...',
            'examples': 'Search examples by description or reference...',
            'analytics': 'Search not available in analytics',
            'create': 'Search not available',
            'createWork': 'Search not available',
            'createExample': 'Search not available',
            'editWork': 'Search not available',
            'editExample': 'Search not available'
        };
        
        searchInput.placeholder = placeholders[section] || 'Search...';
        
        // Clear search when switching sections unless staying in tropes/categories
        if (!['tropes', 'categories'].includes(section)) {
            searchInput.value = '';
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
        const countElement = document.getElementById('categoriesResultsCount');
        
        if (countElement) {
            countElement.textContent = `${this.filteredData.categories.length} categories`;
        }
        
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
            this.filteredData.works = [...this.data.works];
            this.filteredData.examples = [...this.data.examples];
            this.updateSearchResults('');
        } else {
            // Handle search based on current section
            if (this.currentView === 'tropes' || this.currentView === 'categories') {
                // Use the API search for tropes/categories
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
            } else if (this.currentView === 'works') {
                // Client-side search for works
                this.filteredData.works = this.data.works.filter(work => 
                    work.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (work.author && work.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (work.description && work.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    work.type.toLowerCase().includes(searchTerm.toLowerCase())
                );
                this.updateSearchResults(searchTerm, this.filteredData.works.length);
            } else if (this.currentView === 'examples') {
                // Client-side search for examples
                this.filteredData.examples = this.data.examples.filter(example => {
                    const trope = this.data.tropes.find(t => t.id === example.trope_id);
                    const work = this.data.works.find(w => w.id === example.work_id);
                    
                    return example.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (example.page_reference && example.page_reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (trope && trope.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (work && work.title.toLowerCase().includes(searchTerm.toLowerCase()));
                });
                this.updateSearchResults(searchTerm, this.filteredData.examples.length);
            }
        }
        
        // Re-render current view
        if (this.currentView === 'tropes') {
            this.renderTropes();
        } else if (this.currentView === 'categories') {
            this.renderCategories();
        } else if (this.currentView === 'works') {
            this.renderWorks();
        } else if (this.currentView === 'examples') {
            this.renderExamples();
        }
    }

    // Export data functionality
    exportData(type) {
        let data, filename, headers;
        
        const currentDate = new Date().toISOString().slice(0, 10);
        
        switch (type) {
            case 'tropes':
                data = this.filteredData.tropes.length > 0 ? this.filteredData.tropes : this.data.tropes;
                filename = `tropes_export_${currentDate}.csv`;
                headers = ['ID', 'Name', 'Description', 'Categories', 'Created At', 'Updated At'];
                break;
            case 'categories':
                data = this.filteredData.categories.length > 0 ? this.filteredData.categories : this.data.categories;
                filename = `categories_export_${currentDate}.csv`;
                headers = ['ID', 'Name', 'Display Name', 'Description', 'Trope Count', 'Created At', 'Updated At'];
                break;
            case 'works':
                data = this.filteredData.works.length > 0 ? this.filteredData.works : this.data.works;
                filename = `works_export_${currentDate}.csv`;
                headers = ['ID', 'Title', 'Type', 'Year', 'Author', 'Description', 'Created At', 'Updated At'];
                break;
            case 'examples':
                data = this.filteredData.examples.length > 0 ? this.filteredData.examples : this.data.examples;
                filename = `examples_export_${currentDate}.csv`;
                headers = ['ID', 'Trope Name', 'Work Title', 'Description', 'Page Reference', 'Created At', 'Updated At'];
                break;
            default:
                console.error('Unknown export type:', type);
                return;
        }

        if (!data || data.length === 0) {
            alert(`No ${type} data available to export.`);
            return;
        }

        try {
            const csv = this.convertToCSV(data, type, headers);
            this.downloadCSV(csv, filename);
            
            // Show success message
            const count = data.length;
            alert(`Successfully exported ${count} ${type} to ${filename}`);
        } catch (error) {
            console.error('Export error:', error);
            alert(`Failed to export ${type}. Please try again.`);
        }
    }

    convertToCSV(data, type, headers) {
        const rows = [headers];
        
        data.forEach(item => {
            let row;
            
            switch (type) {
                case 'tropes':
                    row = [
                        this.escapeCSV(item.id || ''),
                        this.escapeCSV(item.name || ''),
                        this.escapeCSV(item.description || ''),
                        this.escapeCSV((item.categories || []).join('; ') || ''),
                        this.escapeCSV(item.created_at || ''),
                        this.escapeCSV(item.updated_at || '')
                    ];
                    break;
                case 'categories':
                    row = [
                        this.escapeCSV(item.id || ''),
                        this.escapeCSV(item.name || ''),
                        this.escapeCSV(item.display_name || ''),
                        this.escapeCSV(item.description || ''),
                        this.escapeCSV(item.trope_count?.toString() || '0'),
                        this.escapeCSV(item.created_at || ''),
                        this.escapeCSV(item.updated_at || '')
                    ];
                    break;
                case 'works':
                    row = [
                        this.escapeCSV(item.id || ''),
                        this.escapeCSV(item.title || ''),
                        this.escapeCSV(item.type || ''),
                        this.escapeCSV(item.year?.toString() || ''),
                        this.escapeCSV(item.author || ''),
                        this.escapeCSV(item.description || ''),
                        this.escapeCSV(item.created_at || ''),
                        this.escapeCSV(item.updated_at || '')
                    ];
                    break;
                case 'examples':
                    // Find trope and work names for examples
                    const trope = this.data.tropes.find(t => t.id === item.trope_id);
                    const work = this.data.works.find(w => w.id === item.work_id);
                    
                    row = [
                        this.escapeCSV(item.id || ''),
                        this.escapeCSV(trope?.name || 'Unknown Trope'),
                        this.escapeCSV(work?.title || 'Unknown Work'),
                        this.escapeCSV(item.description || ''),
                        this.escapeCSV(item.page_reference || ''),
                        this.escapeCSV(item.created_at || ''),
                        this.escapeCSV(item.updated_at || '')
                    ];
                    break;
                default:
                    row = [];
            }
            
            rows.push(row);
        });
        
        return rows.map(row => row.join(',')).join('\n');
    }

    escapeCSV(field) {
        if (field == null) return '';
        
        // Convert to string
        const str = String(field);
        
        // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        
        return str;
    }

    downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the URL object
            setTimeout(() => URL.revokeObjectURL(url), 100);
        } else {
            // Fallback for older browsers
            alert('Your browser does not support automatic downloads. Please copy the CSV data manually.');
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
        const worksContainer = document.getElementById('worksContent');
        const worksCount = document.getElementById('worksResultsCount');
        
        if (!worksContainer) return;

        if (worksCount) {
            worksCount.textContent = `${this.filteredData.works.length} work${this.filteredData.works.length === 1 ? '' : 's'}`;
        }

        if (this.filteredData.works.length === 0) {
            worksContainer.innerHTML = '<div class="no-data">No works found. Create your first work to get started!</div>';
            return;
        }

        worksContainer.innerHTML = `
            <div class="items-grid">
                ${this.filteredData.works.map(work => `
                    <div class="item-card">
                        <div class="item-content">
                            <div class="item-title">${this.escapeHtml(work.title)}</div>
                            <div class="item-description">
                                ${this.escapeHtml(work.description || 'No description provided.')}
                            </div>
                            <div class="item-meta">
                                <span class="tag">${this.escapeHtml(work.type)}</span>
                                ${work.author ? `<span class="tag">${this.escapeHtml(work.author)}</span>` : ''}
                                ${work.year ? `<span class="tag">${work.year}</span>` : ''}
                                <span class="tag">${this.data.examples.filter(ex => ex.work_id === work.id).length} examples</span>
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="action-btn action-edit" onclick="app.editWork('${work.id}'); event.stopPropagation();" aria-label="Edit work">
                                ✏️
                            </button>
                            <button class="action-btn action-delete" onclick="app.deleteWork('${work.id}'); event.stopPropagation();" aria-label="Delete work">
                                🗑️
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Render Examples section
    renderExamples() {
        const examplesContainer = document.getElementById('examplesContent');
        const examplesCount = document.getElementById('examplesResultsCount');
        
        if (!examplesContainer) return;

        if (examplesCount) {
            examplesCount.textContent = `${this.filteredData.examples.length} example${this.filteredData.examples.length === 1 ? '' : 's'}`;
        }

        if (this.filteredData.examples.length === 0) {
            examplesContainer.innerHTML = '<div class="no-data">No examples found. Create your first trope-work connection!</div>';
            return;
        }

        examplesContainer.innerHTML = `
            <div class="items-grid">
                ${this.filteredData.examples.map(example => {
                    const trope = this.data.tropes.find(t => t.id === example.trope_id);
                    const work = this.data.works.find(w => w.id === example.work_id);
                    
                    return `
                        <div class="item-card">
                            <div class="item-content">
                                <div class="item-title">
                                    <span class="trope-name">${this.escapeHtml(trope ? trope.name : 'Unknown Trope')}</span>
                                    <span class="connection-arrow"> → </span>
                                    <span class="work-name">${this.escapeHtml(work ? work.title : 'Unknown Work')}</span>
                                </div>
                                <div class="item-description">
                                    ${this.escapeHtml(example.description || 'No description provided.')}
                                </div>
                                ${example.page_reference ? `<div class="item-meta">
                                    <span class="tag">Page: ${this.escapeHtml(example.page_reference)}</span>
                                </div>` : ''}
                            </div>
                            <div class="item-actions">
                                <button class="action-btn action-edit" onclick="app.editExample('${example.id}'); event.stopPropagation();" aria-label="Edit example">
                                    ✏️
                                </button>
                                <button class="action-btn action-delete" onclick="app.deleteExample('${example.id}'); event.stopPropagation();" aria-label="Delete example">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Render Create Work Form
    // Render Create Work Form
    renderCreateWorkForm() {
        // Set up form submission handler
        const form = document.getElementById('createWorkForm');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.handleCreateWork(form);
            };
        }
    }

    // Render Create Example Form
    renderCreateExampleForm() {
        // Populate the trope dropdown
        const tropeSelect = document.getElementById('exampleTrope');
        if (tropeSelect) {
            tropeSelect.innerHTML = '<option value="">Select trope...</option>' + 
                this.data.tropes.map(trope => 
                    `<option value="${trope.id}">${this.escapeHtml(trope.name)}</option>`
                ).join('');
        }
        
        // Populate the work dropdown
        const workSelect = document.getElementById('exampleWork');
        if (workSelect) {
            workSelect.innerHTML = '<option value="">Select work...</option>' + 
                this.data.works.map(work => 
                    `<option value="${work.id}">${this.escapeHtml(work.title)}</option>`
                ).join('');
        }
        
        // Set up form submission handler
        const form = document.getElementById('createExampleForm');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.handleCreateExample(form);
            };
        }
    }

    // Handle Work creation
    async handleCreateWork(form) {
        const formData = new FormData(form);
        const workData = {
            title: formData.get('title') ? formData.get('title').trim() : '',
            type: formData.get('type') || null,
            year: formData.get('year') ? parseInt(formData.get('year')) : null,
            author: formData.get('author') ? formData.get('author').trim() : null,
            description: formData.get('description') ? formData.get('description').trim() : null
        };

        // Validate required fields
        if (!workData.title) {
            alert('Please enter a work title.');
            return;
        }
        
        if (!workData.type) {
            alert('Please select a work type.');
            return;
        }

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
                
                // Reset form
                form.reset();
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
            trope_id: formData.get('trope_id'),
            work_id: formData.get('work_id'),
            description: formData.get('description') ? formData.get('description').trim() : '',
            page_reference: formData.get('page_reference') ? formData.get('page_reference').trim() : null
        };

        // Validate required fields
        if (!exampleData.trope_id || !exampleData.work_id || !exampleData.description) {
            alert('Please fill in all required fields (Trope, Work, and Description).');
            return;
        }

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
                
                // Reset form
                form.reset();
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
        // Store the work ID for the edit operation
        this.currentEditWorkId = workId;
        
        // Find the work to edit
        const work = this.data.works.find(w => w.id === workId);
        if (!work) {
            alert('Work not found!');
            return;
        }
        
        // Show the edit section
        this.showSection('editWork');
    }

    renderEditWorkForm() {
        if (!this.currentEditWorkId) return;
        
        const work = this.data.works.find(w => w.id === this.currentEditWorkId);
        if (!work) return;
        
        // Populate form fields
        document.getElementById('editWorkTitle').value = work.title || '';
        document.getElementById('editWorkType').value = work.type || '';
        document.getElementById('editWorkYear').value = work.year || '';
        document.getElementById('editWorkAuthor').value = work.author || '';
        document.getElementById('editWorkDescription').value = work.description || '';
        
        // Set up form submission handler
        const form = document.getElementById('editWorkForm');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.handleUpdateWork(form);
            };
        }
    }

    async handleUpdateWork(form) {
        if (!this.currentEditWorkId) return;
        
        const formData = new FormData(form);
        const workData = {
            title: formData.get('title') ? formData.get('title').trim() : '',
            type: formData.get('type') || null,
            year: formData.get('year') ? parseInt(formData.get('year')) : null,
            author: formData.get('author') ? formData.get('author').trim() : null,
            description: formData.get('description') ? formData.get('description').trim() : null
        };

        // Validate required fields
        if (!workData.title) {
            alert('Please enter a work title.');
            return;
        }
        
        if (!workData.type) {
            alert('Please select a work type.');
            return;
        }

        try {
            const response = await fetch(`/api/works/${this.currentEditWorkId}`, {
                method: 'PUT',
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
                alert(`Work "${workData.title}" has been updated successfully!`);
                
                // Clear the current edit ID
                this.currentEditWorkId = null;
            } else {
                // Error
                alert(`Failed to update work: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error updating work:', error);
            alert('Failed to update work. Please check your connection.');
        }
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
        // Store the example ID for the edit operation
        this.currentEditExampleId = exampleId;
        
        // Find the example to edit
        const example = this.data.examples.find(e => e.id === exampleId);
        if (!example) {
            alert('Example not found!');
            return;
        }
        
        // Show the edit section
        this.showSection('editExample');
    }

    renderEditExampleForm() {
        if (!this.currentEditExampleId) return;
        
        const example = this.data.examples.find(e => e.id === this.currentEditExampleId);
        if (!example) return;
        
        // Populate the trope dropdown
        const tropeSelect = document.getElementById('editExampleTrope');
        if (tropeSelect) {
            tropeSelect.innerHTML = '<option value="">Select trope...</option>' + 
                this.data.tropes.map(trope => 
                    `<option value="${trope.id}" ${trope.id === example.trope_id ? 'selected' : ''}>${this.escapeHtml(trope.name)}</option>`
                ).join('');
        }
        
        // Populate the work dropdown
        const workSelect = document.getElementById('editExampleWork');
        if (workSelect) {
            workSelect.innerHTML = '<option value="">Select work...</option>' + 
                this.data.works.map(work => 
                    `<option value="${work.id}" ${work.id === example.work_id ? 'selected' : ''}>${this.escapeHtml(work.title)}</option>`
                ).join('');
        }
        
        // Populate other form fields
        document.getElementById('editExampleDescription').value = example.description || '';
        document.getElementById('editExamplePageRef').value = example.page_reference || '';
        
        // Set up form submission handler
        const form = document.getElementById('editExampleForm');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.handleUpdateExample(form);
            };
        }
    }

    async handleUpdateExample(form) {
        if (!this.currentEditExampleId) return;
        
        const formData = new FormData(form);
        const exampleData = {
            trope_id: formData.get('trope_id'),
            work_id: formData.get('work_id'),
            description: formData.get('description') ? formData.get('description').trim() : '',
            page_reference: formData.get('page_reference') ? formData.get('page_reference').trim() : null
        };

        // Validate required fields
        if (!exampleData.trope_id || !exampleData.work_id || !exampleData.description) {
            alert('Please fill in all required fields (Trope, Work, and Description).');
            return;
        }

        try {
            const response = await fetch(`/api/examples/${this.currentEditExampleId}`, {
                method: 'PUT',
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
                alert('Example has been updated successfully!');
                
                // Clear the current edit ID
                this.currentEditExampleId = null;
            } else {
                // Error
                alert(`Failed to update example: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error updating example:', error);
            alert('Failed to update example. Please check your connection.');
        }
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

// Simple status indicator functionality
TropeApp.prototype.setupStatusIndicator = function() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        // Load saved theme or default to light
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
        
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            this.setTheme(newTheme);
        });
    }
    
    // Status indicator click handler
    const statusIndicator = document.getElementById('statusIndicator');
    if (statusIndicator) {
        statusIndicator.addEventListener('click', () => {
            this.checkConnectionStatus();
        });
    }
    
    // Initial connection check
    this.checkConnectionStatus();
};

TropeApp.prototype.setTheme = function(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
};

TropeApp.prototype.checkConnectionStatus = function() {
    const statusDot = document.getElementById('statusDot');
    if (!statusDot) return;
    
    // Show connecting state
    statusDot.classList.remove('connected', 'disconnected');
    statusDot.classList.add('connecting');
    
    fetch('/api', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
    })
    .then(response => {
        if (response.ok) {
            // Connected - green
            statusDot.classList.remove('connecting', 'disconnected');
            statusDot.classList.add('connected');
            
            // Auto-expire after 60 seconds
            if (this.statusTimer) clearTimeout(this.statusTimer);
            this.statusTimer = setTimeout(() => {
                statusDot.classList.remove('connected', 'connecting');
                statusDot.classList.add('disconnected');
            }, 60000);
        } else {
            throw new Error('Server error');
        }
    })
    .catch(error => {
        // Disconnected - grey
        statusDot.classList.remove('connecting', 'connected');
        statusDot.classList.add('disconnected');
    });
};

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TropeApp();
});
