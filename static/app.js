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
        try {
            this.setupEventListeners();
            this.setupStatusIndicator();
            this.setupFormEnhancements(); // Add form enhancements
            await this.loadData();
            this.setupControls();
            this.showSection('tropes');
            
            // Setup AI listeners after DOM is ready
            this.setupAIEventListeners();
            
            // Load AI status when on AI section
            if (this.currentView === 'ai-assistant') {
                this.loadAIStatus();
            }
        } catch (error) {
            console.error('Error during initialization:', error);
            // Continue with basic functionality even if AI features fail
        }
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
        
        // Create Work button - Show form in dynamic container
        document.addEventListener('click', (e) => {
            if (e.target.id === 'createWorkBtn') {
                this.showDynamicForm('work');
            }
        });
        
        // Create Example button - Show form in dynamic container
        document.addEventListener('click', (e) => {
            if (e.target.id === 'createExampleBtn') {
                this.showDynamicForm('example');
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
        
        // Dynamic form submissions - using event delegation
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'dynamicWorkForm') {
                e.preventDefault();
                this.handleDynamicWorkSubmit(e.target);
            } else if (e.target.id === 'dynamicExampleForm') {
                e.preventDefault();
                this.handleDynamicExampleSubmit(e.target);
            }
        });
    }
    
    // ===== FORM ENHANCEMENTS =====
    setupFormEnhancements() {
        // Setup character counters and live validation
        document.addEventListener('input', (e) => {
            if (e.target.matches('input[maxlength], textarea[maxlength]')) {
                this.updateCharacterCounter(e.target);
            }
            
            if (e.target.matches('#editTropeName, #tropeName')) {
                this.validateNameField(e.target);
            }
            
            if (e.target.matches('#editTropeDescription, #tropeDescription')) {
                this.validateDescriptionField(e.target);
            }
        });
        
        // Setup form focus enhancements
        document.addEventListener('focus', (e) => {
            if (e.target.matches('.form-group input, .form-group textarea, .form-group select')) {
                this.enhanceFocusState(e.target);
            }
        }, true);
        
        document.addEventListener('blur', (e) => {
            if (e.target.matches('.form-group input, .form-group textarea, .form-group select')) {
                this.removeFocusState(e.target);
            }
        }, true);
    }
    
    updateCharacterCounter(field) {
        const maxLength = parseInt(field.getAttribute('maxlength'));
        const currentLength = field.value.length;
        const group = field.closest('.form-group');
        
        if (group && maxLength) {
            group.setAttribute('data-current-length', currentLength);
            group.setAttribute('data-max-length', maxLength);
            
            // Add visual feedback for character limit
            const percentage = (currentLength / maxLength) * 100;
            if (percentage > 90) {
                group.classList.add('near-limit');
            } else {
                group.classList.remove('near-limit');
            }
            
            if (currentLength >= maxLength) {
                group.classList.add('at-limit');
            } else {
                group.classList.remove('at-limit');
            }
        }
    }
    
    validateNameField(field) {
        const value = field.value.trim();
        const group = field.closest('.form-group');
        
        if (value.length === 0) {
            this.setFieldState(group, 'neutral');
        } else if (value.length < 2) {
            this.setFieldState(group, 'error', 'Name must be at least 2 characters');
        } else if (value.length > 200) {
            this.setFieldState(group, 'error', 'Name cannot exceed 200 characters');
        } else {
            this.setFieldState(group, 'success');
        }
    }
    
    validateDescriptionField(field) {
        const value = field.value.trim();
        const group = field.closest('.form-group');
        
        if (value.length === 0) {
            this.setFieldState(group, 'neutral');
        } else if (value.length < 10) {
            this.setFieldState(group, 'error', 'Description must be at least 10 characters');
        } else if (value.length > 2000) {
            this.setFieldState(group, 'error', 'Description cannot exceed 2000 characters');
        } else {
            this.setFieldState(group, 'success');
        }
    }
    
    setFieldState(group, state, message = '') {
        // Remove existing state classes
        group.classList.remove('error', 'success', 'neutral');
        
        // Add new state
        if (state !== 'neutral') {
            group.classList.add(state);
        }
        
        // Update help text if needed
        if (message) {
            const helpText = group.querySelector('.field-help');
            if (helpText) {
                helpText.textContent = message;
            }
        } else {
            // Restore original help text
            const field = group.querySelector('input, textarea, select');
            if (field) {
                this.restoreOriginalHelpText(group, field);
            }
        }
    }
    
    restoreOriginalHelpText(group, field) {
        const helpText = group.querySelector('.field-help');
        if (helpText && field) {
            const fieldName = field.name || field.id;
            const originalMessages = {
                'name': 'Give your trope a clear, memorable name (2-200 characters)',
                'description': 'Provide a detailed explanation of the trope (10-2000 characters)'
            };
            
            if (originalMessages[fieldName]) {
                helpText.textContent = originalMessages[fieldName];
            }
        }
    }
    
    enhanceFocusState(field) {
        const group = field.closest('.form-group');
        if (group) {
            group.classList.add('focused');
        }
        
        // Auto-expand textarea on focus
        if (field.tagName === 'TEXTAREA') {
            const currentHeight = parseInt(window.getComputedStyle(field).height);
            const minExpandedHeight = 160;
            if (currentHeight < minExpandedHeight) {
                field.style.transition = 'height 0.3s ease';
                field.style.height = minExpandedHeight + 'px';
            }
        }
    }
    
    removeFocusState(field) {
        const group = field.closest('.form-group');
        if (group) {
            group.classList.remove('focused');
        }
    }
    // ===== END FORM ENHANCEMENTS =====
    
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
            
            // Extract data from API responses
            this.data.tropes = tropesData.tropes || [];
            this.data.categories = categoriesData.categories || [];
            this.data.works = worksData.works || [];
            this.data.examples = examplesData.examples || [];
            
            // Debug logging
            console.log('Data loaded at', new Date().toISOString(), {
                tropes: this.data.tropes.length,
                categories: this.data.categories.length,
                works: this.data.works.length,
                examples: this.data.examples.length
            });
            
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
            
            // Load AI status when showing AI section
            if (section === 'ai-assistant') {
                this.loadAIStatus();
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
    
    showDynamicForm(formType) {
        const container = document.getElementById('dynamicFormContainer');
        if (!container) {
            console.error('Dynamic form container not found');
            return;
        }
        
        // Create form HTML based on type
        let formHTML = '';
        if (formType === 'work') {
            formHTML = this.getWorkFormHTML();
        } else if (formType === 'example') {
            formHTML = this.getExampleFormHTML();
        }
        
        // Show container with form
        container.innerHTML = formHTML;
        container.style.display = 'block';
        
        // Smooth scroll to form
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Focus first input
        const firstInput = container.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 300);
        }
    }
    
    getWorkFormHTML() {
        return `
            <div class="create-form-container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3>Add New Work</h3>
                    <button type="button" onclick="app.hideDynamicForm()" class="btn-icon" title="Close">✕</button>
                </div>
                <form id="dynamicWorkForm" class="create-form">
                    <div class="form-group">
                        <label for="dynamicWorkTitle">Title *</label>
                        <input type="text" id="dynamicWorkTitle" name="title" required minlength="1" maxlength="200" placeholder="Enter work title..." autocomplete="off">
                        <span class="field-help">1-200 characters</span>
                    </div>
                    <div class="form-group">
                        <label for="dynamicWorkType">Type *</label>
                        <select id="dynamicWorkType" name="type" required class="control-select">
                            <option value="">Select type...</option>
                            <option value="Novel">Novel</option>
                            <option value="Film">Film</option>
                            <option value="TV Show">TV Show</option>
                            <option value="Short Story">Short Story</option>
                            <option value="Comic">Comic</option>
                            <option value="Game">Game</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="dynamicWorkAuthor">Author</label>
                        <input type="text" id="dynamicWorkAuthor" name="author" maxlength="200" placeholder="Enter author/creator name...">
                    </div>
                    <div class="form-group">
                        <label for="dynamicWorkYear">Year</label>
                        <input type="number" id="dynamicWorkYear" name="year" min="1" max="2100" placeholder="Publication/release year">
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="app.hideDynamicForm()" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Add Work</button>
                    </div>
                </form>
            </div>
        `;
    }
    
    getExampleFormHTML() {
        // Get tropes and works for dropdowns
        const tropeOptions = this.data.tropes.map(trope => 
            `<option value="${trope.id}">${trope.name}</option>`
        ).join('');
        
        const workOptions = this.data.works.map(work => 
            `<option value="${work.id}">${work.title}</option>`
        ).join('');
        
        return `
            <div class="create-form-container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3>Add New Example</h3>
                    <button type="button" onclick="app.hideDynamicForm()" class="btn-icon" title="Close">✕</button>
                </div>
                <form id="dynamicExampleForm" class="create-form">
                    <div class="form-group">
                        <label for="dynamicExampleTrope">Trope *</label>
                        <select id="dynamicExampleTrope" name="trope_id" required class="control-select">
                            <option value="">Select trope...</option>
                            ${tropeOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="dynamicExampleWork">Work *</label>
                        <select id="dynamicExampleWork" name="work_id" required class="control-select">
                            <option value="">Select work...</option>
                            ${workOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="dynamicExampleDescription">Description *</label>
                        <textarea id="dynamicExampleDescription" name="description" required minlength="5" maxlength="2000" rows="4" placeholder="Describe how this trope appears in the work..."></textarea>
                    </div>
                    <div class="form-group">
                        <label for="dynamicExamplePageRef">Page/Scene Reference</label>
                        <input type="text" id="dynamicExamplePageRef" name="page_reference" maxlength="100" placeholder="Page numbers, chapter, scene, timestamp...">
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="app.hideDynamicForm()" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Add Example</button>
                    </div>
                </form>
            </div>
        `;
    }
    
    hideDynamicForm() {
        const container = document.getElementById('dynamicFormContainer');
        if (container) {
            container.classList.add('closing');
            setTimeout(() => {
                container.style.display = 'none';
                container.classList.remove('closing');
                container.innerHTML = '';
            }, 200);
        }
    }
    
    showDynamicModal() {
        const container = document.getElementById('dynamicFormContainer');
        if (container) {
            container.style.display = 'block';
            // Smooth scroll to modal
            container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
                    <div class="item-card" data-card-id="${trope.id}" onclick="app.toggleCardExpansion('tropes', '${trope.id}', event)">
                        <div class="item-content">
                            <div class="item-title">${this.escapeHtml(trope.name)}</div>
                            <div class="item-description truncated">
                                ${this.escapeHtml(trope.description || 'No description provided.')}
                            </div>
                            <div class="item-meta">
                                <div class="category-tags">
                                    ${trope.categories.map(cat => `<span class="tag category clickable" onclick="app.filterByCategory('${this.escapeHtml(cat)}'); event.stopPropagation();" title="Filter by ${this.escapeHtml(cat)}">${this.escapeHtml(cat)}</span>`).join('')}
                                </div>
                                <div class="relationship-stats">
                                    <span class="stat-item" title="${trope.categories_count} categor${trope.categories_count !== 1 ? 'ies' : 'y'} assigned">🏷️ ${trope.categories_count}</span>
                                    ${trope.works_count > 0 ? `<span class="stat-item clickable" onclick="app.viewTropeWorks('${trope.id}'); event.stopPropagation();" title="📚 Referenced in ${trope.works_count} work${trope.works_count !== 1 ? 's' : ''} - click to view">📚 ${trope.works_count}</span>` : ''}
                                    ${trope.examples_count > 0 ? `<span class="stat-item clickable" onclick="app.viewTropeExamples('${trope.id}'); event.stopPropagation();" title="� ${trope.examples_count} specific example${trope.examples_count !== 1 ? 's' : ''} documented from books/media - click to view details">🔗 ${trope.examples_count}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="item-actions">
                            ${trope.works_count > 0 ? `<button class="action-btn action-view" onclick="app.viewTropeWorks('${trope.id}'); event.stopPropagation();" aria-label="View works using this trope" title="📚 View all ${trope.works_count} work${trope.works_count !== 1 ? 's' : ''} that use this trope">📚</button>` : ''}
                            ${trope.examples_count > 0 ? `<button class="action-btn action-examples" onclick="app.viewTropeExamples('${trope.id}'); event.stopPropagation();" aria-label="View examples of this trope" title="🔗 View ${trope.examples_count} documented example${trope.examples_count !== 1 ? 's' : ''} of this trope in action">🔗</button>` : ''}
                            <button class="action-btn action-edit" onclick="app.editTrope('${trope.id}'); event.stopPropagation();" aria-label="Edit trope" title="✏️ Edit this trope's name, description, and categories">
                                ✏️
                            </button>
                            <button class="action-btn action-delete" onclick="app.deleteTrope('${trope.id}'); event.stopPropagation();" aria-label="Delete trope" title="🗑️ Permanently delete this trope and all its data">
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
                    <div class="item-card">
                        <div class="item-content" onclick="app.showCategoryDetail('${category.id}')">
                            <div class="item-title">${this.escapeHtml(category.display_name || category.name)}</div>
                            <div class="item-meta">
                                <span class="count">${category.trope_count} tropes</span>
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="action-btn action-edit" onclick="app.editCategory('${category.id}'); event.stopPropagation();" aria-label="Edit category" title="Edit category">
                                ✏️
                            </button>
                            <button class="action-btn action-delete" onclick="app.deleteCategory('${category.id}'); event.stopPropagation();" aria-label="Delete category" title="Delete category">
                                🗑️
                            </button>
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
                    <h4>📊 Categories</h4>
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
        
        // Calculate total for percentages
        const total = categories.reduce((sum, cat) => sum + cat.trope_count, 0);
        
        // Generate colors for each category
        const colors = [
            '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
            '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
        ];
        
        // Create pie chart segments
        let currentAngle = 0;
        const pieSegments = categories.slice(0, 8).map((category, index) => {
            const percentage = (category.trope_count / total) * 100;
            const angle = (category.trope_count / total) * 360;
            const color = colors[index % colors.length];
            
            // Create conic gradient segment
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;
            
            return {
                category,
                percentage: percentage.toFixed(1),
                color,
                startAngle,
                endAngle
            };
        });
        
        // Build conic gradient
        const gradientStops = [];
        pieSegments.forEach(segment => {
            gradientStops.push(`${segment.color} ${segment.startAngle}deg ${segment.endAngle}deg`);
        });
        
        return `
            <div class="pie-chart-container">
                <div class="pie-chart" style="background: conic-gradient(${gradientStops.join(', ')})"></div>
                <div class="pie-chart-legend">
                    ${pieSegments.map(segment => `
                        <div class="legend-item">
                            <span class="legend-color" style="background-color: ${segment.color}"></span>
                            <span class="legend-label">${this.escapeHtml(segment.category.name)}</span>
                            <span class="legend-value">${segment.percentage}% (${segment.category.trope_count})</span>
                        </div>
                    `).join('')}
                    ${categories.length > 8 ? `<div class="legend-item text-muted">...and ${categories.length - 8} more</div>` : ''}
                </div>
            </div>
        `;
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

    async showTropeDetail(tropeId, fromContext = null) {
        this.showLoading();
        
        try {
            const response = await fetch(`/api/tropes/${tropeId}`);
            if (!response.ok) {
                throw new Error('Trope not found');
            }
            
            const trope = await response.json();
            
            // Determine back button text and target container based on current context
            let backButtonText = '← Back to Tropes';
            let targetContainer = 'tropesContent';
            
            if (this.currentView === 'categories' || fromContext === 'categories') {
                backButtonText = '← Back to Category';
                targetContainer = 'categoriesContent';
            }
            
            const html = `
                <div class="item-detail">
                    <button class="back-button" onclick="app.goBackFromDetail()">${backButtonText}</button>
                    <div class="detail-header">
                        <h2 class="detail-title">${this.escapeHtml(trope.name)}</h2>
                        <div class="detail-description">${this.escapeHtml(trope.description || 'No description available.')}</div>
                    </div>
                    <div class="detail-section">
                        <h3>Relationships</h3>
                        <div class="relationship-stats detail-stats">
                            <span class="stat-item" title="${trope.categories_count} categor${trope.categories_count !== 1 ? 'ies' : 'y'}">🏷️ ${trope.categories_count} categor${trope.categories_count !== 1 ? 'ies' : 'y'}</span>
                            ${trope.works_count > 0 ? `<span class="stat-item clickable" onclick="app.viewTropeWorks('${trope.id}')" title="Appears in ${trope.works_count} work${trope.works_count !== 1 ? 's' : ''}">📚 ${trope.works_count} work${trope.works_count !== 1 ? 's' : ''}</span>` : '<span class="stat-item">📚 0 works</span>'}
                            ${trope.examples_count > 0 ? `<span class="stat-item clickable" onclick="app.viewTropeExamples('${trope.id}')" title="${trope.examples_count} example${trope.examples_count !== 1 ? 's' : ''} recorded">🔗 ${trope.examples_count} example${trope.examples_count !== 1 ? 's' : ''}</span>` : '<span class="stat-item">🔗 0 examples</span>'}
                        </div>
                    </div>
                    <div class="detail-section">
                        <h3>Categories</h3>
                        <div class="item-meta">
                            ${trope.categories && trope.categories.length > 0 
                                ? trope.categories.map(cat => `<span class="tag category clickable-tag" onclick="app.filterByCategory('${cat.name}')">${this.escapeHtml(cat.name)}</span>`).join('') 
                                : '<span class="text-muted">No categories assigned</span>'}
                        </div>
                    </div>
                    <div class="detail-actions">
                        ${trope.works_count > 0 ? `<button class="btn btn-primary" onclick="app.viewTropeWorks('${trope.id}')">📚 View Works</button>` : ''}
                        ${trope.examples_count > 0 ? `<button class="btn btn-primary" onclick="app.viewTropeExamples('${trope.id}')">🔗 View Examples</button>` : ''}
                        <button class="btn btn-secondary" onclick="app.editTrope('${trope.id}')">✏️ Edit Trope</button>
                        <button class="btn btn-danger" onclick="app.deleteTrope('${trope.id}')">🗑️ Delete Trope</button>
                    </div>
                </div>
            `;
            
            document.getElementById(targetContainer).innerHTML = html;
            
        } catch (error) {
            this.showError('Failed to load trope details.');
            console.error('Error loading trope details:', error);
        }
    }
    
    toggleCardExpansion(cardType, itemId, event) {
        event.stopPropagation();
        
        // Find the card element
        const card = document.querySelector(`[data-card-id="${itemId}"]`);
        if (!card) {
            console.warn(`Card not found for ${cardType} with id ${itemId}`);
            return;
        }
        
        // Toggle the expanded state
        const isExpanded = card.classList.contains('expanded');
        
        if (isExpanded) {
            // Collapse the card
            card.classList.remove('expanded');
            
            // Re-add truncation to description
            const description = card.querySelector('.item-description');
            if (description) {
                description.classList.add('truncated');
            }
        } else {
            // Expand the card
            card.classList.add('expanded');
            
            // Remove truncation from description
            const description = card.querySelector('.item-description');
            if (description) {
                description.classList.remove('truncated');
            }
        }
    }
    
    goBackFromDetail() {
        if (this.currentView === 'categories') {
            // If we have a previous category context, go back to category detail
            if (this.previousCategoryId) {
                this.showCategoryDetail(this.previousCategoryId);
            } else {
                // Otherwise go back to categories list
                this.renderCategories();
            }
        } else {
            // Go back to tropes
            this.renderTropes();
        }
    }
    
    filterByCategory(categoryName) {
        // Switch to tropes section and apply filter
        this.showSection('tropes');
        
        // Find the category in our data
        const category = this.data.categories.find(cat => 
            cat.name === categoryName || cat.display_name === categoryName
        );
        
        if (category) {
            // Set the filter
            const filterSelect = document.getElementById('categoryFilter');
            if (filterSelect) {
                filterSelect.value = category.name;
                // Trigger the filter change
                this.handleControlChange();
            }
        }
    }
    
    async showCategoryDetail(categoryId) {
        this.showLoading();
        
        try {
            // Store the category ID for back navigation
            this.previousCategoryId = categoryId;
            
            const response = await fetch(`/api/categories/${categoryId}/tropes`);
            if (!response.ok) {
                throw new Error('Category not found');
            }
            
            const data = await response.json();
            
            const html = `
                <div class="item-detail">
                    <button class="back-button" onclick="app.renderCategories()">← Back to Categories</button>
                    <div class="detail-header">
                        <h2 class="detail-title">${this.escapeHtml(data.category.display_name || data.category.name)}</h2>
                        <p class="text-muted">${data.trope_count} tropes in this category</p>
                    </div>
                    <div class="detail-section">
                        <h3>Tropes in this Category</h3>
                        ${data.tropes.length > 0 ? `
                            <div class="items-grid">
                                ${data.tropes.map(trope => `
                                    <div class="item-card trope-detail-card" onclick="app.showTropeDetail('${trope.id}', 'categories')">
                                        <div class="item-title">${this.escapeHtml(trope.name)}</div>
                                        <div class="item-description">
                                            ${this.escapeHtml(trope.description || '').substring(0, 150)}${trope.description && trope.description.length > 150 ? '...' : ''}
                                        </div>
                                        <div class="item-meta">
                                            ${trope.categories && trope.categories.length > 0 
                                                ? trope.categories.slice(0, 3).map(cat => `<span class="tag">${this.escapeHtml(cat)}</span>`).join('') 
                                                : ''}
                                            ${trope.categories && trope.categories.length > 3 ? `<span class="tag">+${trope.categories.length - 3} more</span>` : ''}
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
    
    async handleDynamicWorkSubmit(form) {
        const submitButton = form.querySelector('button[type="submit"]');
        
        // Get form data
        const formData = new FormData(form);
        const title = formData.get('title').trim();
        const type = formData.get('type');
        const author = formData.get('author')?.trim();
        const year = formData.get('year');
        
        // Validate
        if (!title || !type) {
            alert('Please fill in all required fields.');
            return;
        }
        
        // Show loading
        submitButton.disabled = true;
        submitButton.textContent = 'Adding...';
        
        try {
            const workData = { title, type };
            if (author) workData.author = author;
            if (year) workData.year = parseInt(year);
            
            const response = await fetch('/api/works', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workData)
            });
            
            if (response.ok) {
                // Success - refresh data and close form
                await this.loadData();
                this.hideDynamicForm();
                this.showSection('works'); // Navigate to works section
                alert('Work added successfully!');
            } else {
                const result = await response.json();
                alert(result.error || 'Failed to add work');
            }
            
        } catch (error) {
            console.error('Error adding work:', error);
            alert('Network error. Please check your connection.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Add Work';
        }
    }
    
    async handleDynamicExampleSubmit(form) {
        const submitButton = form.querySelector('button[type="submit"]');
        
        // Get form data
        const formData = new FormData(form);
        const tropeId = formData.get('trope_id');
        const workId = formData.get('work_id');
        const description = formData.get('description').trim();
        const pageReference = formData.get('page_reference')?.trim();
        
        // Validate
        if (!tropeId || !workId || !description) {
            alert('Please fill in all required fields.');
            return;
        }
        
        // Show loading
        submitButton.disabled = true;
        submitButton.textContent = 'Adding...';
        
        try {
            const exampleData = { trope_id: tropeId, work_id: workId, description };
            if (pageReference) exampleData.page_reference = pageReference;
            
            const response = await fetch('/api/examples', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(exampleData)
            });
            
            if (response.ok) {
                // Success - refresh data and close form
                await this.loadData();
                this.hideDynamicForm();
                this.showSection('examples'); // Navigate to examples section
                alert('Example added successfully!');
            } else {
                const result = await response.json();
                alert(result.error || 'Failed to add example');
            }
            
        } catch (error) {
            console.error('Error adding example:', error);
            alert('Network error. Please check your connection.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Add Example';
        }
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

    async viewTropeWorks(tropeId) {
        try {
            const response = await fetch(`/api/tropes/${tropeId}/works`);
            if (!response.ok) {
                throw new Error('Failed to fetch trope works');
            }
            
            const data = await response.json();
            
            // Show works in a detailed view
            const container = document.getElementById('dynamicFormContainer');
            container.innerHTML = `
                <div class="form-header">
                    <h2>📚 Works featuring "${data.trope_name}"</h2>
                    <button type="button" onclick="app.hideDynamicForm()" class="btn btn-secondary">← Back</button>
                </div>
                <div class="works-list">
                    ${data.works.length === 0 ? 
                        '<p class="text-muted">No works found for this trope.</p>' : 
                        data.works.map(work => `
                            <div class="work-card">
                                <h3>${this.escapeHtml(work.title)}</h3>
                                <div class="work-meta">
                                    <span class="work-type">${this.escapeHtml(work.type)}</span>
                                    ${work.year ? `<span class="work-year">(${work.year})</span>` : ''}
                                    ${work.author ? `<span class="work-author">by ${this.escapeHtml(work.author)}</span>` : ''}
                                </div>
                                ${work.example_description ? `<div class="example-description">${this.escapeHtml(work.example_description)}</div>` : ''}
                                ${work.page_reference ? `<div class="page-reference">Page: ${this.escapeHtml(work.page_reference)}</div>` : ''}
                            </div>
                        `).join('')
                    }
                </div>
            `;
            this.showDynamicModal();
            
        } catch (error) {
            console.error('Error loading trope works:', error);
            alert('Failed to load works for this trope.');
        }
    }

    async viewTropeExamples(tropeId) {
        try {
            const response = await fetch(`/api/tropes/${tropeId}/examples`);
            if (!response.ok) {
                throw new Error('Failed to fetch trope examples');
            }
            
            const data = await response.json();
            
            // Show examples in a detailed view
            const container = document.getElementById('dynamicFormContainer');
            container.innerHTML = `
                <div class="form-header">
                    <h2>🔗 Examples of "${data.trope_name}"</h2>
                    <button type="button" onclick="app.hideDynamicForm()" class="btn btn-secondary">← Back</button>
                </div>
                <div class="examples-list">
                    ${data.examples.length === 0 ? 
                        '<p class="text-muted">No examples found for this trope.</p>' : 
                        data.examples.map(example => `
                            <div class="example-card">
                                <h3>${this.escapeHtml(example.work_title)}</h3>
                                <div class="work-meta">
                                    <span class="work-type">${this.escapeHtml(example.work_type)}</span>
                                    ${example.work_year ? `<span class="work-year">(${example.work_year})</span>` : ''}
                                    ${example.work_author ? `<span class="work-author">by ${this.escapeHtml(example.work_author)}</span>` : ''}
                                </div>
                                <div class="example-description">${this.escapeHtml(example.description)}</div>
                                ${example.page_reference ? `<div class="page-reference">Page: ${this.escapeHtml(example.page_reference)}</div>` : ''}
                            </div>
                        `).join('')
                    }
                </div>
            `;
            this.showDynamicModal();
            
        } catch (error) {
            console.error('Error loading trope examples:', error);
            alert('Failed to load examples for this trope.');
        }
    }

    async editCategory(categoryId) {
        // TODO: Implement category editing
        alert('Category editing feature coming soon!');
    }

    async deleteCategory(categoryId) {
        // TODO: Implement category deletion
        alert('Category deletion feature coming soon!');
    }

    // Render Works section
    renderWorks() {
        console.log('renderWorks called, filtered works:', this.filteredData.works.length);
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
                    <div class="item-card" data-card-id="${work.id}" onclick="app.toggleCardExpansion('works', '${work.id}', event)">
                        <div class="item-content">
                            <div class="item-title">${this.escapeHtml(work.title)}</div>
                            <div class="item-description truncated">
                                ${this.escapeHtml(work.description || 'No description provided.')}
                            </div>
                            <div class="item-meta">
                                <span class="tag">${this.escapeHtml(work.type)}</span>
                                ${work.author ? `<span class="tag">${this.escapeHtml(work.author)}</span>` : ''}
                                ${work.year ? `<span class="tag">${work.year}</span>` : ''}
                                <span class="tag clickable" title="🔗 ${this.data.examples.filter(ex => ex.work_id === work.id).length} documented trope examples from this work - click card to view details">${this.data.examples.filter(ex => ex.work_id === work.id).length} examples</span>
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="action-btn action-edit" onclick="app.editWork('${work.id}'); event.stopPropagation();" title="✏️ Edit this work's details" aria-label="Edit work">
                                ✏️
                            </button>
                            <button class="action-btn action-delete" onclick="app.deleteWork('${work.id}'); event.stopPropagation();" title="🗑️ Delete this work and all associated examples" aria-label="Delete work">
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
        console.log('renderExamples called, filtered examples:', this.filteredData.examples.length);
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
                        <div class="item-card" data-card-id="${example.id}" onclick="app.toggleCardExpansion('examples', '${example.id}', event)">
                            <div class="item-content">
                                <div class="item-title">
                                    ${this.escapeHtml(work ? work.title : 'Unknown Work')}
                                </div>
                                <div class="item-meta">
                                    <span class="tag trope-tag">${this.escapeHtml(trope ? trope.name : 'Unknown Trope')}</span>
                                    ${work && work.author ? `<span class="tag">${this.escapeHtml(work.author)}</span>` : ''}
                                    ${work && work.year ? `<span class="tag">${work.year}</span>` : ''}
                                    ${example.page_reference ? `<span class="tag">Page: ${this.escapeHtml(example.page_reference)}</span>` : ''}
                                </div>
                                <div class="item-description truncated">
                                    ${this.escapeHtml(example.description || 'No description provided.')}
                                </div>
                            </div>
                            <div class="item-actions">
                                <button class="action-btn action-edit" onclick="app.editExample('${example.id}'); event.stopPropagation();" title="✏️ Edit this trope-work connection" aria-label="Edit example">
                                    ✏️
                                </button>
                                <button class="action-btn action-delete" onclick="app.deleteExample('${example.id}'); event.stopPropagation();" title="🗑️ Remove this example connection" aria-label="Delete example">
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

// Filter tropes by category
TropeApp.prototype.filterByCategory = function(categoryName) {
    // Set the category filter in the controls
    const categorySelect = document.getElementById('categoryFilter');
    if (categorySelect) {
        // Find the option that matches the category name
        for (let option of categorySelect.options) {
            if (option.text === categoryName) {
                option.selected = true;
                break;
            }
        }
    }
    
    // Apply the filter
    this.applyFilters();
    
    // Show tropes section if not already showing
    this.showSection('tropes');
};

// View works that use a specific trope
TropeApp.prototype.viewTropeWorks = async function(tropeId) {
    try {
        const response = await fetch(`/api/tropes/${tropeId}/works`);
        if (response.ok) {
            const data = await response.json();
            
            // Create a modal or section to show the works
            this.showTropeWorksModal(data);
        } else {
            console.error('Failed to fetch trope works');
            alert('Failed to load related works');
        }
    } catch (error) {
        console.error('Error fetching trope works:', error);
        alert('Error loading related works');
    }
};

// Show modal with works using a trope
TropeApp.prototype.showTropeWorksModal = function(data) {
    // Create modal HTML
    const modalHtml = `
        <div class="modal-overlay" onclick="this.remove()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>Works Using: ${this.escapeHtml(data.trope_name)}</h3>
                    <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="modal-body">
                    ${data.works.length === 0 ? 
                        '<p>No works found using this trope.</p>' :
                        `<div class="works-list">
                            ${data.works.map(work => `
                                <div class="work-item">
                                    <div class="work-header">
                                        <strong>${this.escapeHtml(work.title)}</strong>
                                        <span class="work-type">(${this.escapeHtml(work.type)})</span>
                                        ${work.year ? `<span class="work-year">${work.year}</span>` : ''}
                                    </div>
                                    ${work.author ? `<div class="work-author">by ${this.escapeHtml(work.author)}</div>` : ''}
                                    <div class="examples">
                                        ${work.examples.map(example => `
                                            <div class="example-item">
                                                <div class="example-description">${this.escapeHtml(example.description)}</div>
                                                ${example.page_reference ? `<div class="example-reference">Reference: ${this.escapeHtml(example.page_reference)}</div>` : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>`
                    }
                </div>
                <div class="modal-footer">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn btn-secondary">Close</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// ===== AI ASSISTANT FUNCTIONALITY =====

TropeApp.prototype.setupAIEventListeners = function() {
        try {
            // AI Query functionality
            const aiQueryBtn = document.getElementById('aiQueryBtn');
            const aiQueryInput = document.getElementById('aiQueryInput');
            
            if (aiQueryBtn && aiQueryInput) {
                aiQueryBtn.addEventListener('click', () => {
                    this.handleAIQuery();
                });
                
                aiQueryInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.handleAIQuery();
                    }
                });
            }
            
            // Example query buttons
            document.querySelectorAll('.example-query').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const query = e.target.dataset.query;
                    const input = document.getElementById('aiQueryInput');
                    if (input) {
                        input.value = query;
                        this.handleAIQuery();
                    }
                });
            });
            
            // Book search functionality
            const bookSearchBtn = document.getElementById('bookSearchBtn');
            const bookSearchInput = document.getElementById('bookSearchInput');
            
            if (bookSearchBtn && bookSearchInput) {
                bookSearchBtn.addEventListener('click', () => {
                    this.handleBookSearch();
                });
                
                bookSearchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.handleBookSearch();
                    }
                });
            }
        } catch (error) {
            console.warn('AI event listeners setup failed:', error);
            // AI features will not be available, but app should continue working
        }
    };
    
    TropeApp.prototype.handleAIQuery = async function() {
        const input = document.getElementById('aiQueryInput');
        const resultsDiv = document.getElementById('aiQueryResults');
        const query = input.value.trim();
        
        if (!query) {
            this.showAIResults(resultsDiv, { success: false, error: 'Please enter a question' });
            return;
        }
        
        // Show loading state
        resultsDiv.innerHTML = '<div class="ai-results loading">Asking AI...</div>';
        
        try {
            const response = await fetch('/api/ai/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query })
            });
            
            const result = await response.json();
            this.showAIResults(resultsDiv, result);
            
        } catch (error) {
            console.error('AI Query Error:', error);
            this.showAIResults(resultsDiv, { 
                success: false, 
                error: `Network error: ${error.message}` 
            });
        }
    };
    
    TropeApp.prototype.showAIResults = function(container, result) {
        if (!result.success) {
            container.innerHTML = `
                <div class="ai-results">
                    <div class="ai-query-info" style="background: var(--danger-50); border-color: var(--danger-200); color: var(--danger-800);">
                        ❌ Error: ${result.error}
                    </div>
                </div>
            `;
            return;
        }
        
        const results = result.results || [];
        const count = results.length;
        
        let html = `
            <div class="ai-results">
                <div class="ai-query-info">
                    ✨ Found ${count} result${count !== 1 ? 's' : ''} • ${result.explanation}
                </div>
        `;
        
        if (count > 0) {
            html += '<div class="ai-results-content">';
            results.forEach(item => {
                html += `
                    <div class="ai-result-item">
                        <div class="ai-result-title">${this.escapeHtml(item.name || item.title || 'Unknown')}</div>
                        <div class="ai-result-description">${this.escapeHtml(item.description || item.content || 'No description available')}</div>
                        ${item.categories ? `<div style="margin-top: 0.5rem;"><strong>Categories:</strong> ${this.escapeHtml(item.categories)}</div>` : ''}
                        ${item.author ? `<div style="margin-top: 0.5rem;"><strong>Author:</strong> ${this.escapeHtml(item.author)}</div>` : ''}
                    </div>
                `;
            });
            html += '</div>';
        } else {
            html += '<div style="text-align: center; color: var(--gray-500); padding: 2rem;">No results found</div>';
        }
        
        html += '</div>';
        container.innerHTML = html;
    };
    
    TropeApp.prototype.handleBookSearch = async function() {
        const input = document.getElementById('bookSearchInput');
        const resultsDiv = document.getElementById('bookSearchResults');
        const query = input.value.trim();
        
        if (!query) {
            resultsDiv.innerHTML = '<div style="text-align: center; color: var(--gray-500);">Please enter a book title to search</div>';
            return;
        }
        
        // Show loading state
        resultsDiv.innerHTML = '<div class="ai-results loading">Searching books...</div>';
        
        try {
            const response = await fetch(`/api/ai/books/search?q=${encodeURIComponent(query)}&limit=5`);
            const result = await response.json();
            
            this.showBookResults(resultsDiv, result);
            
        } catch (error) {
            console.error('Book Search Error:', error);
            resultsDiv.innerHTML = `
                <div style="background: var(--danger-50); border: 1px solid var(--danger-200); color: var(--danger-800); padding: 1rem; border-radius: 6px;">
                    ❌ Search failed: ${error.message}
                </div>
            `;
        }
    };
    
    TropeApp.prototype.showBookResults = function(container, result) {
        if (!result.success) {
            container.innerHTML = `
                <div style="background: var(--danger-50); border: 1px solid var(--danger-200); color: var(--danger-800); padding: 1rem; border-radius: 6px;">
                    ❌ Error: ${result.error}
                </div>
            `;
            return;
        }
        
        const books = result.books || [];
        const count = books.length;
        
        if (count === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--gray-500); padding: 2rem;">
                    📚 No books found for "${result.query}"
                </div>
            `;
            return;
        }
        
        let html = `<div style="margin-bottom: 1rem; font-weight: 500; color: var(--gray-700);">Found ${count} book${count !== 1 ? 's' : ''}:</div>`;
        
        books.forEach(book => {
            const authors = book.authors ? book.authors.map(a => a.name).join(', ') : 'Unknown Author';
            const description = book.description || 'No description available';
            
            html += `
                <div class="book-result-item">
                    ${book.cover_image ? 
                        `<img src="${book.cover_image}" alt="${this.escapeHtml(book.title)}" class="book-cover" onerror="this.outerHTML='<div class=\\"book-cover-placeholder\\">No Cover</div>'">` :
                        '<div class="book-cover-placeholder">No Cover</div>'
                    }
                    <div class="book-info">
                        <div class="book-title">${this.escapeHtml(book.title)}</div>
                        <div class="book-author">by ${this.escapeHtml(authors)}</div>
                        <div class="book-description">${this.escapeHtml(description)}</div>
                        <div class="book-actions">
                            <button class="import-book-btn" onclick="app.importBook('${this.escapeHtml(book.title)}', ${this.escapeHtml(JSON.stringify(book))})">
                                🤖 Import & Extract Tropes
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    };
    
    TropeApp.prototype.importBook = async function(title, bookData) {
        const resultsDiv = document.getElementById('bookSearchResults');
        
        // Show loading state
        const loadingDiv = document.createElement('div');
        loadingDiv.innerHTML = '<div class="ai-results loading">Importing book and extracting tropes using AI...</div>';
        resultsDiv.appendChild(loadingDiv);
        
        try {
            const response = await fetch('/api/ai/books/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title })
            });
            
            const result = await response.json();
            loadingDiv.remove();
            
            if (result.success) {
                const tropeCount = result.tropes_added ? result.tropes_added.length : 0;
                const successDiv = document.createElement('div');
                successDiv.innerHTML = `
                    <div style="background: var(--success-50); border: 1px solid var(--success-200); color: var(--success-800); padding: 1rem; border-radius: 6px; margin-top: 1rem;">
                        ✅ Successfully imported "${title}" and discovered ${tropeCount} trope${tropeCount !== 1 ? 's' : ''}!
                        ${tropeCount > 0 ? `<br><strong>Tropes found:</strong> ${result.tropes_added.map(t => t.name).join(', ')}` : ''}
                    </div>
                `;
                resultsDiv.appendChild(successDiv);
                
                // Refresh data
                await this.loadData();
                
                // Show success briefly then remove
                setTimeout(() => successDiv.remove(), 5000);
            } else {
                const errorDiv = document.createElement('div');
                errorDiv.innerHTML = `
                    <div style="background: var(--danger-50); border: 1px solid var(--danger-200); color: var(--danger-800); padding: 1rem; border-radius: 6px; margin-top: 1rem;">
                        ❌ Import failed: ${result.error}
                    </div>
                `;
                resultsDiv.appendChild(errorDiv);
                setTimeout(() => errorDiv.remove(), 5000);
            }
            
        } catch (error) {
            loadingDiv.remove();
            console.error('Import Error:', error);
            
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = `
                <div style="background: var(--danger-50); border: 1px solid var(--danger-200); color: var(--danger-800); padding: 1rem; border-radius: 6px; margin-top: 1rem;">
                    ❌ Import failed: ${error.message}
                </div>
            `;
            resultsDiv.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 5000);
        }
    };
    
    TropeApp.prototype.loadAIStatus = async function() {
        try {
            const response = await fetch('/api/ai/status');
            const status = await response.json();
            
            const serviceStatus = document.getElementById('aiServiceStatus');
            const modelsStatus = document.getElementById('aiModelsStatus');
            
            if (serviceStatus) {
                serviceStatus.textContent = status.ai_service || 'Unknown';
                serviceStatus.className = `status-value ${status.ai_service === 'ready' ? 'success' : 'error'}`;
            }
            
            if (modelsStatus) {
                const apis = status.apis_configured || {};
                const available = Object.entries(apis)
                    .filter(([key, value]) => value)
                    .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1))
                    .join(', ');
                
                modelsStatus.textContent = available || 'None';
                modelsStatus.className = `status-value ${available ? 'success' : 'error'}`;
            }
            
        } catch (error) {
            console.error('Failed to load AI status:', error);
            
            const serviceStatus = document.getElementById('aiServiceStatus');
            const modelsStatus = document.getElementById('aiModelsStatus');
            
            if (serviceStatus) {
                serviceStatus.textContent = 'Error';
                serviceStatus.className = 'status-value error';
            }
            
            if (modelsStatus) {
                modelsStatus.textContent = 'Unavailable';
                modelsStatus.className = 'status-value error';
            }
        }
    };
    
    TropeApp.prototype.escapeHtml = function(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TropeApp();
});
