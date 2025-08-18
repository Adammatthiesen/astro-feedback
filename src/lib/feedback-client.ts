/**
 * Astro Feedback API Client SDK
 *
 * A simple client library for interacting with the Astro Feedback API
 */

export interface FeedbackSubmission {
	websiteId: number;
	categoryId?: number;
	type: 'bug' | 'feature' | 'improvement' | 'question' | 'compliment' | 'complaint' | 'other';
	title: string;
	description: string;
	email?: string;
	name?: string;
	url?: string;
	// biome-ignore lint/suspicious/noExplicitAny: Allows for dynamic types
	metadata?: Record<string, any>;
}

export interface FeedbackItem {
	id: number;
	websiteId: number;
	categoryId?: number;
	categoryName?: string;
	type: string;
	status: string;
	priority: string;
	title: string;
	description: string;
	email?: string;
	name?: string;
	url?: string;
	isPublic: boolean;
	upvotes: number;
	downvotes: number;
	createdAt: string;
	updatedAt: string;
}

// biome-ignore lint/suspicious/noExplicitAny: Allows for dynamic types
export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	pagination?: {
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	};
}

export interface FeedbackQueryOptions {
	status?: 'new' | 'in_review' | 'in_progress' | 'resolved' | 'closed' | 'spam';
	type?: 'bug' | 'feature' | 'improvement' | 'question' | 'compliment' | 'complaint' | 'other';
	category?: string;
	limit?: number;
	offset?: number;
	sort?: 'newest' | 'oldest' | 'priority' | 'upvotes';
	public?: boolean;
}

export class FeedbackClient {
	private baseUrl: string;
	private apiKey: string;
	private websiteId: number;

	constructor(config: {
		baseUrl: string;
		apiKey: string;
		websiteId: number;
	}) {
		this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
		this.apiKey = config.apiKey;
		this.websiteId = config.websiteId;
	}

	private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
		const url = `${this.baseUrl}${endpoint}`;

		const response = await fetch(url, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': this.apiKey,
				...options.headers,
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		return response.json();
	}

	/**
	 * Submit new feedback
	 */
	async submitFeedback(
		feedback: Omit<FeedbackSubmission, 'websiteId'>
	): Promise<ApiResponse<{ id: number; status: string; createdAt: string }>> {
		return this.request('/api/feedback', {
			method: 'POST',
			body: JSON.stringify({
				...feedback,
				websiteId: this.websiteId,
			}),
		});
	}

	/**
	 * Get feedback list
	 */
	async getFeedback(options: FeedbackQueryOptions = {}): Promise<ApiResponse<FeedbackItem[]>> {
		const params = new URLSearchParams({
			websiteId: this.websiteId.toString(),
			...Object.fromEntries(
				Object.entries(options).map(([key, value]) => [key, value?.toString() || ''])
			),
		});

		return this.request(`/api/feedback?${params}`);
	}

	/**
	 * Get single feedback item
	 */
	async getFeedbackById(id: number): Promise<ApiResponse<FeedbackItem>> {
		return this.request(`/api/feedback/${id}`);
	}

	/**
	 * Vote on feedback
	 */
	async vote(
		feedbackId: number,
		voteType: 'up' | 'down',
		voterEmail?: string
	): Promise<ApiResponse<{ upvotes: number; downvotes: number }>> {
		return this.request(`/api/feedback/${feedbackId}/vote`, {
			method: 'POST',
			body: JSON.stringify({
				voteType,
				voterEmail,
			}),
		});
	}

	/**
	 * Remove vote
	 */
	async removeVote(
		feedbackId: number,
		voterEmail?: string
	): Promise<ApiResponse<{ upvotes: number; downvotes: number }>> {
		const headers: Record<string, string> = {};
		if (voterEmail) {
			headers['x-voter-email'] = voterEmail;
		}

		return this.request(`/api/feedback/${feedbackId}/vote`, {
			method: 'DELETE',
			headers,
		});
	}

	/**
	 * Add comment to feedback
	 */
	async addComment(
		feedbackId: number,
		comment: {
			content: string;
			authorName?: string;
			authorEmail?: string;
			isInternal?: boolean;
		}
		// biome-ignore lint/suspicious/noExplicitAny: Allows for dynamic types
	): Promise<ApiResponse<any>> {
		return this.request(`/api/feedback/${feedbackId}/comments`, {
			method: 'POST',
			body: JSON.stringify(comment),
		});
	}

	/**
	 * Get comments for feedback
	 */
	// biome-ignore lint/suspicious/noExplicitAny: Allows for dynamic types
	async getComments(feedbackId: number, includeInternal = false): Promise<ApiResponse<any[]>> {
		const params = new URLSearchParams();
		if (includeInternal) {
			params.set('includeInternal', 'true');
		}

		return this.request(`/api/feedback/${feedbackId}/comments?${params}`);
	}

	/**
	 * Get categories for website
	 */
	// biome-ignore lint/suspicious/noExplicitAny: Allows for dynamic types
	async getCategories(): Promise<ApiResponse<any[]>> {
		const params = new URLSearchParams({
			websiteId: this.websiteId.toString(),
		});

		return this.request(`/api/categories?${params}`);
	}

	/**
	 * Get analytics data
	 */

	// biome-ignore lint/suspicious/noExplicitAny: Allows for dynamic types
	async getAnalytics(timeframe: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<ApiResponse<any>> {
		const params = new URLSearchParams({
			websiteId: this.websiteId.toString(),
			timeframe,
		});

		return this.request(`/api/analytics?${params}`);
	}
}

/**
 * Feedback Widget Class
 *
 * A simple widget for embedding feedback forms
 */
export class FeedbackWidget {
	private client: FeedbackClient;
	private container: HTMLElement;
	private isOpen = false;

	constructor(config: {
		baseUrl: string;
		apiKey: string;
		websiteId: number;
		containerId: string;
	}) {
		this.client = new FeedbackClient(config);

		const container = document.getElementById(config.containerId);
		if (!container) {
			throw new Error(`Container with ID "${config.containerId}" not found`);
		}
		this.container = container;

		this.init();
	}

	private init() {
		this.render();
	}

	private render() {
		this.container.innerHTML = `
      <div id="feedback-widget" class="feedback-widget ${this.isOpen ? 'open' : ''}">
        <button id="feedback-toggle" class="feedback-toggle">
          💬 Feedback
        </button>
        
        <div id="feedback-form-container" class="feedback-form-container">
          <div class="feedback-form">
            <div class="feedback-header">
              <h3>Send Feedback</h3>
              <button id="feedback-close">&times;</button>
            </div>
            
            <form id="feedback-submit-form">
              <div class="form-group">
                <label for="feedback-type">Type:</label>
                <select id="feedback-type" required>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="improvement">Improvement</option>
                  <option value="question">Question</option>
                  <option value="compliment">Compliment</option>
                  <option value="complaint">Complaint</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="feedback-title">Title:</label>
                <input type="text" id="feedback-title" required>
              </div>
              
              <div class="form-group">
                <label for="feedback-description">Description:</label>
                <textarea id="feedback-description" rows="4" required></textarea>
              </div>
              
              <div class="form-group">
                <label for="feedback-email">Email (optional):</label>
                <input type="email" id="feedback-email">
              </div>
              
              <div class="form-actions">
                <button type="submit" class="btn-primary">Send Feedback</button>
                <button type="button" id="feedback-cancel" class="btn-secondary">Cancel</button>
              </div>
            </form>
            
            <div id="feedback-result" class="feedback-result"></div>
          </div>
        </div>
      </div>
      
      <style>
        .feedback-widget {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 1000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .feedback-toggle {
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 25px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          transition: all 0.3s ease;
        }
        
        .feedback-toggle:hover {
          background: #0056b3;
          transform: translateY(-2px);
        }
        
        .feedback-form-container {
          position: absolute;
          bottom: 60px;
          right: 0;
          width: 350px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 5px 25px rgba(0,0,0,0.2);
          transform: scale(0.8);
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }
        
        .feedback-widget.open .feedback-form-container {
          transform: scale(1);
          opacity: 1;
          visibility: visible;
        }
        
        .feedback-form {
          padding: 20px;
        }
        
        .feedback-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }
        
        .feedback-header h3 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }
        
        #feedback-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #333;
          font-size: 14px;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 14px;
          box-sizing: border-box;
        }
        
        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }
        
        .form-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        
        .btn-primary {
          background: #007bff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          flex: 1;
        }
        
        .btn-primary:hover {
          background: #0056b3;
        }
        
        .btn-secondary {
          background: #6c757d;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          flex: 1;
        }
        
        .btn-secondary:hover {
          background: #545b62;
        }
        
        .feedback-result {
          margin-top: 15px;
          padding: 10px;
          border-radius: 5px;
          font-size: 14px;
          display: none;
        }
        
        .feedback-result.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .feedback-result.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
      </style>
    `;

		this.attachEventListeners();
	}

	private attachEventListeners() {
		const toggle = document.getElementById('feedback-toggle');
		const close = document.getElementById('feedback-close');
		const cancel = document.getElementById('feedback-cancel');
		const form = document.getElementById('feedback-submit-form') as HTMLFormElement;

		toggle?.addEventListener('click', () => this.toggle());
		close?.addEventListener('click', () => this.close());
		cancel?.addEventListener('click', () => this.close());

		form?.addEventListener('submit', (e) => this.handleSubmit(e));
	}

	private toggle() {
		this.isOpen = !this.isOpen;
		const widget = document.getElementById('feedback-widget');
		if (widget) {
			widget.classList.toggle('open', this.isOpen);
		}
	}

	private close() {
		this.isOpen = false;
		const widget = document.getElementById('feedback-widget');
		if (widget) {
			widget.classList.remove('open');
		}
		this.clearForm();
	}

	private clearForm() {
		const form = document.getElementById('feedback-submit-form') as HTMLFormElement;
		if (form) {
			form.reset();
		}

		const result = document.getElementById('feedback-result');
		if (result) {
			result.style.display = 'none';
			result.className = 'feedback-result';
		}
	}

	private async handleSubmit(e: Event) {
		e.preventDefault();

		const type = (document.getElementById('feedback-type') as HTMLSelectElement).value;
		const title = (document.getElementById('feedback-title') as HTMLInputElement).value;
		const description = (document.getElementById('feedback-description') as HTMLTextAreaElement)
			.value;
		const email = (document.getElementById('feedback-email') as HTMLInputElement).value;

		const result = document.getElementById('feedback-result');
		if (!result) return;

		try {
			const response = await this.client.submitFeedback({
				type: type as
					| 'bug'
					| 'feature'
					| 'improvement'
					| 'question'
					| 'compliment'
					| 'complaint'
					| 'other',
				title,
				description,
				email: email || undefined,
				url: window.location.href,
			});

			if (response.success) {
				result.textContent = 'Thank you! Your feedback has been submitted.';
				result.className = 'feedback-result success';
				result.style.display = 'block';

				setTimeout(() => {
					this.close();
				}, 2000);
			} else {
				throw new Error(response.error || 'Failed to submit feedback');
			}
		} catch (error) {
			result.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
			result.className = 'feedback-result error';
			result.style.display = 'block';
		}
	}
}

// Export for direct usage
export default FeedbackClient;
