import React, { useState, useEffect } from 'react';
import {
  Users, Mail, Plus, X, Upload, ChevronRight, LayoutDashboard,
  Settings, User, Send, FileText, Search, BarChart3, Download,
  Play, Pause, Trash2, Check, Edit, AlertCircle, Eye, Star, Minimize2,
  RefreshCw, MoreVertical, ChevronLeft, ArrowLeft, Clock,
  MousePointer, MessageSquare, Reply, Forward, Archive, Menu, Paperclip
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5001/api';

export default function RMail() {
  const [currentPage, setCurrentPage] = useState('inbox');
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [emails, setEmails] = useState([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeMinimized, setComposeMinimized] = useState(false);

  // Resume state
  const [resume, setResume] = useState(null);
  const [resumeMetadata, setResumeMetadata] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  // Campaign state
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  // Gmail state
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Compose state
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeAttachments, setComposeAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setComposeAttachments([...composeAttachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index) => {
    setComposeAttachments(composeAttachments.filter((_, i) => i !== index));
  };

  const folders = [
    { id: 'inbox', name: 'Inbox', icon: Mail, count: emails.filter(e => e.folder === 'inbox').length },
    { id: 'starred', name: 'Starred', icon: Star, count: emails.filter(e => e.starred).length },
    { id: 'sent', name: 'Sent', icon: Send, count: emails.filter(e => e.folder === 'sent').length },
    { id: 'drafts', name: 'Drafts', icon: FileText, count: emails.filter(e => e.folder === 'drafts').length },
  ];

  const menuItems = [
    { id: 'inbox', name: 'Inbox', icon: Mail, page: 'inbox' },
    { id: 'profile', name: 'Profile & Resume', icon: Upload, page: 'profile' },
    { id: 'campaigns', name: 'Campaigns', icon: Users, page: 'campaigns' },
    { id: 'template', name: 'Edit Template', icon: FileText, page: 'template' },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, page: 'analytics' },
  ];

  // Load resume and campaigns on mount
  useEffect(() => {
    loadResume();
    loadCampaigns();
    checkGmailStatus();
    loadEmails();
  }, []);

  useEffect(() => {
    loadEmails();
  }, [activeFolder]);

  const loadResume = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/resume`);
      if (response.ok) {
        const data = await response.json();
        setResume({
          name: data.filename,
          size: 'N/A',
          uploadedAt: new Date().toISOString(),
        });
        setResumeMetadata(data.metadata);
      } else {
        // Resume might not exist yet, that's okay
        console.log('No resume found');
      }
    } catch (error) {
      // Don't show error for network issues - backend might not be running
      if (!error.message.includes('Failed to fetch')) {
        console.error('Error loading resume:', error);
      }
    }
  };

  const loadCampaigns = async () => {
    setCampaignsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/campaigns`);
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data);
      } else {
        console.error('Failed to load campaigns:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      // Don't show alert for network errors - backend might not be running
      if (error.message.includes('Failed to fetch')) {
        console.warn('Backend server might not be running. Make sure Flask server is running on port 5001');
      }
    } finally {
      setCampaignsLoading(false);
    }
  };

  // Resume upload handler
  const handleResumeUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setResumeLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${API_BASE_URL}/resume/upload`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setResume({
            name: data.filename,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            uploadedAt: data.uploadedAt,
          });
          setResumeMetadata(data.metadata);
        } else {
          const error = await response.json();
          alert(`Error: ${error.error}`);
        }
      } catch (error) {
        console.error('Error uploading resume:', error);
        alert('Failed to upload resume');
      } finally {
        setResumeLoading(false);
      }
    }
  };

  const handleResumeRemove = async () => {
    if (!resume) return;

    try {
      const response = await fetch(`${API_BASE_URL}/resume/${resume.name}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setResume(null);
        setResumeMetadata(null);
      }
    } catch (error) {
      console.error('Error removing resume:', error);
    }
  };

  // Campaign creation
  const handleCreateCampaign = async (campaignData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: campaignData.name,
          recipients: campaignData.recipients,
          attachResume: campaignData.attachResume,
        }),
      });

      if (response.ok) {
        const newCampaign = await response.json();
        setCampaigns([...campaigns, newCampaign]);
        setCurrentPage('campaigns');
        await loadCampaigns(); // Refresh to get updated list
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    }
  };

  const handleSendCampaign = async (campaignId) => {
    if (!confirm('Are you sure you want to send this campaign? This will send emails to all recipients.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/send`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Campaign sent! ${result.sent} emails sent, ${result.failed} failed.`);
        await loadCampaigns(); // Refresh campaigns
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      alert('Failed to send campaign');
    }
  };

  const checkGmailStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/gmail/status`);
      if (response.ok) {
        const data = await response.json();
        setGmailConnected(data.connected);
        setGmailEmail(data.email || '');
      }
    } catch (error) {
      // Don't show error for network issues - backend might not be running
      if (!error.message.includes('Failed to fetch')) {
        console.error('Error checking Gmail status:', error);
      }
    }
  };

  const connectGmail = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/gmail/auth`);
      const data = await response.json();

      if (response.ok) {
        if (data.auth_url) {
          window.location.href = data.auth_url;
        } else {
          alert('Error: No authorization URL received');
        }
      } else {
        console.error('Gmail auth error:', data);
        alert(`Error: ${data.error || 'Failed to connect Gmail. Please check if client_secret.json file exists in the project root.'}`);
      }
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      alert(`Failed to connect Gmail: ${error.message}\n\nMake sure:\n1. client_secret.json file exists in project root\n2. Backend server is running\n3. Check browser console for details`);
    }
  };

  const syncEmails = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/emails/sync`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        alert(`Synced ${data.synced} emails (${data.inbox} inbox, ${data.sent} sent)`);
        await loadEmails();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error syncing emails:', error);
      alert('Failed to sync emails');
    } finally {
      setSyncing(false);
    }
  };

  const loadEmails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/emails?folder=${activeFolder}`);
      if (response.ok) {
        const data = await response.json();
        setEmails(data);
      }
    } catch (error) {
      // Don't show error for network issues - backend might not be running
      if (!error.message.includes('Failed to fetch')) {
        console.error('Error loading emails:', error);
      }
    }
  };

  const toggleStar = async (emailId, e) => {
    e.stopPropagation();
    try {
      const response = await fetch(`${API_BASE_URL}/emails/${emailId}/star`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        setEmails(emails.map(email =>
          email.id === emailId || email.gmail_id === emailId
            ? { ...email, starred: data.starred }
            : email
        ));
      }
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const toggleRead = (emailId) => {
    setEmails(emails.map(email =>
      email.id === emailId ? { ...email, read: !email.read } : email
    ));
  };

  const handleEmailClick = (email) => {
    setSelectedEmail(email);
    if (!email.read) {
      toggleRead(email.id);
    }
  };

  const handleSendEmail = async () => {
    if (!composeTo || !composeSubject || !composeBody) {
      alert('Please fill in all fields');
      return;
    }

    setSending(true);
    const formData = new FormData();
    formData.append('to', composeTo);
    formData.append('subject', composeSubject);
    formData.append('body', composeBody);

    composeAttachments.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${API_BASE_URL}/email/send`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Email sent successfully!');
        setIsComposeOpen(false);
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        setComposeAttachments([]);
        loadEmails(); // Refresh sent folder
      } else {
        const error = await response.json();
        alert(`Failed to send: ${error.error}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Error sending email. Check console.');
    } finally {
      setSending(false);
    }
  };

  const handleBack = () => {
    setSelectedEmail(null);
  };

  const getFilteredEmails = () => {
    if (activeFolder === 'starred') {
      return emails.filter(e => e.starred);
    }
    return emails.filter(e => e.folder === activeFolder);
  };

  const filteredEmails = getFilteredEmails();

  // Profile/Resume Page
  const ProfilePage = () => (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-normal text-gray-900 mb-8">Profile & Resume</h1>

        {/* Resume Upload Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-medium text-gray-900 mb-4">Resume</h2>

          {!resume ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Upload your resume (PDF only)</p>
              {resumeLoading ? (
                <p className="text-blue-600">Uploading and extracting metadata...</p>
              ) : (
                <label className="inline-block">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleResumeUpload}
                    className="hidden"
                    disabled={resumeLoading}
                  />
                  <span className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded cursor-pointer inline-block">
                    Choose File
                  </span>
                </label>
              )}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="font-medium text-gray-900">{resume.name}</p>
                    <p className="text-sm text-gray-500">{resume.size} • Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleResumeRemove}
                    className="p-2 hover:bg-red-50 text-red-600 rounded flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded p-4 text-sm text-green-800 flex items-start gap-3">
                <div className="bg-green-100 p-1 rounded-full mt-0.5">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold">Ready to Attach</p>
                  <p>This resume will be automatically attached to emails sent from the Campaigns tab.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Campaign Creation Page
  const CampaignCreationPage = () => {
    const [campaignName, setCampaignName] = useState('');
    const [recipients, setRecipients] = useState('');
    const [attachResume, setAttachResume] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      if (file) {
        setUploading(true);
        setUploadedFile(file);
        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await fetch(`${API_BASE_URL}/recipients/upload`, {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            // Format recipients for display
            const recipientList = data.recipients.map(r =>
              typeof r === 'string' ? r : r.email
            ).join('\n');
            setRecipients(recipientList);
            alert(`Successfully loaded ${data.count} recipients from file`);
          } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
          }
        } catch (error) {
          console.error('Error uploading file:', error);
          alert('Failed to parse file');
        } finally {
          setUploading(false);
        }
      }
    };

    const handleCreate = () => {
      const recipientList = recipients.split('\n').filter(r => r.trim());
      handleCreateCampaign({
        name: campaignName,
        recipients: recipientList,
        attachResume,
      });
    };

    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-normal text-gray-900 mb-8">Create New Campaign</h1>

          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
            {/* Campaign Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g., Summer 2025 Internship Outreach"
                className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Upload Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Recipients (Excel/CSV)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-3">Upload Excel or CSV with email addresses</p>
                <label className="inline-block">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <span className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded cursor-pointer inline-block text-sm">
                    Choose File
                  </span>
                </label>
                {uploading && (
                  <p className="text-sm text-blue-600 mt-2">Uploading and parsing...</p>
                )}
                {uploadedFile && !uploading && (
                  <p className="text-sm text-green-600 mt-2">✓ {uploadedFile.name} uploaded</p>
                )}
              </div>
            </div>

            {/* Recipients List */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipients (one per line)
              </label>
              <textarea
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="john@google.com&#10;sarah@microsoft.com"
                className="w-full h-32 border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <p className="text-sm text-gray-500 mt-1">
                {recipients.split('\n').filter(r => r.trim()).length} recipients
              </p>
            </div>

            {/* Resume Attachment Option */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={attachResume}
                  onChange={(e) => setAttachResume(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900">Attach Resume as PDF</p>
                  <p className="text-sm text-gray-500 mt-1">
                    When enabled, your resume PDF will be directly attached to each email.
                    Otherwise, a link will be included in the email body (recommended for bulk).
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleCreate}
                disabled={!campaignName || !recipients.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2 rounded font-medium"
              >
                Create Campaign
              </button>
              <button
                onClick={() => setCurrentPage('campaigns')}
                className="border border-gray-300 hover:bg-gray-50 px-6 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Campaigns List Page
  const CampaignsPage = () => (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-normal text-gray-900">Campaigns</h1>
          <div className="flex gap-2">
            <button
              onClick={loadCampaigns}
              className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
            <button
              onClick={() => setCurrentPage('create-campaign')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Campaign
            </button>
          </div>
        </div>

        {campaignsLoading ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-gray-500">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">No campaigns yet</h2>
            <p className="text-gray-500 mb-6">Create your first internship outreach campaign</p>
            <button
              onClick={() => setCurrentPage('create-campaign')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map(campaign => (
              <div
                key={campaign.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedCampaign(campaign)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{campaign.name}</h3>
                    <p className="text-sm text-gray-500">
                      Created {new Date(campaign.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${campaign.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                    campaign.status === 'active' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                    {campaign.status}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-2xl font-semibold text-gray-900">{campaign.stats.total}</p>
                    <p className="text-sm text-gray-500">Total</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <p className="text-2xl font-semibold text-blue-700">{campaign.stats.sent}</p>
                    <p className="text-sm text-gray-500">Sent</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <p className="text-2xl font-semibold text-green-700">{campaign.stats.opened}</p>
                    <p className="text-sm text-gray-500">Opened</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded">
                    <p className="text-2xl font-semibold text-purple-700">{campaign.stats.replied}</p>
                    <p className="text-sm text-gray-500">Replied</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {campaign.attachResume ? (
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        Resume attached as PDF
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        Resume link included
                      </span>
                    )}
                  </div>
                  {campaign.status === 'draft' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendCampaign(campaign.id);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium"
                    >
                      Send Campaign
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Template Editor Page
  const TemplatePage = () => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      loadTemplate();
    }, []);

    const loadTemplate = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/template`);
        if (response.ok) {
          const data = await response.json();
          setContent(data.content);
        }
      } catch (error) {
        console.error('Error loading template:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleSave = async () => {
      setSaving(true);
      try {
        const response = await fetch(`${API_BASE_URL}/template`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });

        if (response.ok) {
          alert('Template saved successfully!');
        } else {
          alert('Failed to save template');
        }
      } catch (error) {
        console.error('Error saving template:', error);
        alert('Error saving template');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-normal text-gray-900">Email Template</h1>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">Template Variables</p>
              <p>You can use Jinja2 syntax for variables:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><code>{`{{ company_name }}`}</code> - Recipient's company</li>
                <li><code>{`{{ position }}`}</code> - Recipient's position</li>
                <li><code>{`{{ industry }}`}</code> - Company industry</li>
                <li><code>{`{{ location }}`}</code> - Company location</li>
              </ul>
              <p className="mt-3">The first line of the template starting with "Subject:" will be used as the email subject.</p>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading template...</div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-[600px] border border-gray-300 rounded-lg p-4 font-mono text-sm leading-relaxed outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Subject: Your Subject Here&#10;&#10;Hi There,&#10;&#10;Body of the email..."
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  // Analytics Page
  const AnalyticsPage = () => {
    const [analytics, setAnalytics] = useState({
      totalCampaigns: 0,
      totalSent: 0,
      totalOpened: 0,
      totalReplied: 0,
      openRate: 0,
      replyRate: 0,
    });

    useEffect(() => {
      loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/analytics`);
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error('Error loading analytics:', error);
      }
    };

    const totalCampaigns = analytics.totalCampaigns;
    const totalSent = analytics.totalSent;
    const totalOpened = analytics.totalOpened;
    const totalReplied = analytics.totalReplied;

    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-normal text-gray-900 mb-8">Analytics</h1>

          {/* Overall Stats */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-8 h-8 text-blue-600" />
                <p className="text-3xl font-semibold text-gray-900">{totalCampaigns}</p>
              </div>
              <p className="text-gray-600">Total Campaigns</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Send className="w-8 h-8 text-blue-600" />
                <p className="text-3xl font-semibold text-gray-900">{totalSent}</p>
              </div>
              <p className="text-gray-600">Emails Sent</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <MousePointer className="w-8 h-8 text-green-600" />
                <p className="text-3xl font-semibold text-gray-900">{totalOpened}</p>
              </div>
              <p className="text-gray-600">Opened</p>
              <p className="text-sm text-gray-500">
                {analytics.openRate.toFixed(1)}% rate
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="w-8 h-8 text-purple-600" />
                <p className="text-3xl font-semibold text-gray-900">{totalReplied}</p>
              </div>
              <p className="text-gray-600">Replied</p>
              <p className="text-sm text-gray-500">
                {analytics.replyRate.toFixed(1)}% rate
              </p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-medium text-gray-900 mb-4">Recent Activity</h2>
            {campaigns.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No activity yet</p>
            ) : (
              <div className="space-y-3">
                {campaigns.slice(0, 5).map(campaign => (
                  <div key={campaign.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-gray-900">{campaign.name}</p>
                      <p className="text-sm text-gray-500">
                        {campaign.stats.sent} sent • {campaign.stats.opened} opened • {campaign.stats.replied} replied
                      </p>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Email View Page
  const EmailViewPage = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="border-b border-gray-200 p-2 flex items-center gap-2">
        <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <Archive className="w-5 h-5 text-gray-700" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <AlertCircle className="w-5 h-5 text-gray-700" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <Trash2 className="w-5 h-5 text-gray-700" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-2" />
        <button
          onClick={() => toggleRead(selectedEmail.id)}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <Mail className="w-5 h-5 text-gray-700" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <Clock className="w-5 h-5 text-gray-700" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <MoreVertical className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-normal text-gray-900 mb-6">{selectedEmail.subject}</h1>

        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
            {selectedEmail.sender.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{selectedEmail.sender}</span>
              <span className="text-gray-500 text-sm">&lt;{selectedEmail.email}&gt;</span>
            </div>
            <div className="text-gray-500 text-sm mt-1">to me</div>
          </div>
          <div className="text-gray-500 text-sm">{selectedEmail.time}</div>
          <button
            onClick={(e) => toggleStar(selectedEmail.id, e)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <Star className={`w-5 h-5 ${selectedEmail.starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded-full">
            <Reply className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded-full">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
          {selectedEmail.body}
        </div>

        <div className="mt-8 flex gap-2">
          <button className="px-6 py-2 border border-gray-300 rounded-full hover:bg-gray-50 flex items-center gap-2 text-gray-700">
            <Reply className="w-4 h-4" />
            Reply
          </button>
          <button className="px-6 py-2 border border-gray-300 rounded-full hover:bg-gray-50 flex items-center gap-2 text-gray-700">
            <Forward className="w-4 h-4" />
            Forward
          </button>
        </div>
      </div>
    </div>
  );

  // Email List View
  const EmailListView = () => (
    <>
      <div className="border-b border-gray-200 p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input type="checkbox" className="w-4 h-4 rounded" />
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <RefreshCw className="w-5 h-5 text-gray-700" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <MoreVertical className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>1-{filteredEmails.length} of {filteredEmails.length}</span>
          <div className="flex gap-1">
            <button className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50" disabled>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50" disabled>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Mail className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg">No emails yet</p>
            <p className="text-sm mt-2">Your {activeFolder} is empty</p>
          </div>
        ) : (
          filteredEmails.map(email => (
            <div
              key={email.id || email.gmail_id}
              onClick={() => handleEmailClick(email)}
              className={`group flex items-center gap-4 px-4 py-3 border-b border-gray-100 hover:shadow-md cursor-pointer transition-shadow ${!email.read ? 'bg-white' : 'bg-gray-50'
                }`}
            >
              <input
                type="checkbox"
                className="w-4 h-4 rounded"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => toggleStar(email.id || email.gmail_id, e)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Star className={`w-5 h-5 ${email.starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
              </button>
              <div className={`flex-shrink-0 w-48 ${!email.read ? 'font-bold' : 'font-normal'} text-gray-900`}>
                {email.sender}
              </div>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span className={`${!email.read ? 'font-semibold' : 'font-normal'} text-gray-900`}>
                  {email.subject}
                </span>
                <span className="text-gray-600 truncate">
                  {!email.read && '- '}
                  {email.preview}
                </span>
              </div>
              <div className={`flex-shrink-0 text-sm ${!email.read ? 'font-semibold' : 'font-normal'} text-gray-600`}>
                {email.time}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  // Render current page
  const renderPage = () => {
    if (currentPage === 'profile') {
      return <ProfilePage />;
    }
    if (currentPage === 'create-campaign') {
      return <CampaignCreationPage />;
    }
    if (currentPage === 'campaigns') {
      return <CampaignsPage />;
    }
    if (currentPage === 'template') {
      return <TemplatePage />;
    }
    if (currentPage === 'analytics') {
      return <AnalyticsPage />;
    }
    if (currentPage === 'inbox') {
      if (selectedEmail) {
        return <EmailViewPage />;
      }
      return (
        <>
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-4 mb-4">
              {!gmailConnected ? (
                <button
                  onClick={connectGmail}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium"
                >
                  Connect Gmail
                </button>
              ) : (
                <>
                  <div className="text-sm text-gray-600">
                    Connected: {gmailEmail}
                  </div>
                  <button
                    onClick={syncEmails}
                    disabled={syncing}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Sync Emails'}
                  </button>
                </>
              )}
            </div>
            <div className="flex-1 flex items-center bg-gray-100 rounded-lg px-4 py-2">
              <Search className="w-5 h-5 text-gray-600 mr-3" />
              <input
                type="text"
                placeholder="Search mail"
                className="flex-1 bg-transparent outline-none text-gray-700"
              />
            </div>
          </div>
          <EmailListView />
        </>
      );
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 flex flex-col">
        <div className="p-4 flex items-center gap-3">
          <Menu className="w-6 h-6 text-gray-600 cursor-pointer" />
          <Mail className="w-8 h-8 text-blue-600" />
          <span className="text-xl text-gray-700 font-medium">R-mail</span>
        </div>

        <div className="px-4 mb-4">
          <button
            onClick={() => setIsComposeOpen(true)}
            className="bg-blue-100 hover:bg-blue-200 text-gray-800 font-medium py-3 px-6 rounded-2xl flex items-center gap-3 shadow-sm transition-all w-full"
          >
            <div className="w-10 h-10 flex items-center justify-center">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                <path d="M3 3h18v18H3z" fill="#4285f4" />
                <path d="M3 3l9 9" stroke="white" strokeWidth="2" />
              </svg>
            </div>
            <span>Compose</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;
            return (
              <div
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.page);
                  if (item.page === 'inbox') {
                    setActiveFolder('inbox');
                    setSelectedEmail(null);
                  }
                }}
                className={`flex items-center gap-4 px-6 py-2 cursor-pointer hover:bg-gray-100 rounded-r-full mr-2 ${isActive ? 'bg-blue-100 text-blue-600 font-medium' : 'text-gray-700'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.name}</span>
              </div>
            );
          })}

          {currentPage === 'inbox' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              {folders.slice(1).map(folder => {
                const Icon = folder.icon;
                const isActive = activeFolder === folder.id;
                return (
                  <div
                    key={folder.id}
                    onClick={() => {
                      setActiveFolder(folder.id);
                      setSelectedEmail(null);
                    }}
                    className={`flex items-center gap-4 px-6 py-2 cursor-pointer hover:bg-gray-100 rounded-r-full mr-2 ${isActive ? 'bg-blue-100 text-blue-600 font-medium' : 'text-gray-700'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1">{folder.name}</span>
                    {folder.count > 0 && (
                      <span className="text-sm">{folder.count}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {renderPage()}
      </div>

      {/* Compose Window */}
      {isComposeOpen && (
        <div className={`fixed ${composeMinimized ? 'bottom-0 right-4' : 'bottom-0 right-4'} w-96 bg-white rounded-t-lg shadow-2xl border border-gray-300 z-50`}>
          <div className="bg-gray-900 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
            <span className="font-medium">New Message</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setComposeMinimized(!composeMinimized)}
                className="hover:bg-gray-700 p-1 rounded"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="hover:bg-gray-700 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!composeMinimized && (
            <div className="flex flex-col h-96">
              <div className="border-b border-gray-200 px-4 py-2">
                <input
                  type="text"
                  placeholder="Recipients"
                  className="w-full outline-none text-sm"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                />
              </div>
              <div className="border-b border-gray-200 px-4 py-2">
                <input
                  type="text"
                  placeholder="Subject"
                  className="w-full outline-none text-sm"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                />
              </div>

              <textarea
                className="flex-1 px-4 py-2 outline-none resize-none text-sm"
                placeholder="Compose email"
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
              />

              {/* Attachments List */}
              {composeAttachments.length > 0 && (
                <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-gray-100 bg-gray-50 max-h-24 overflow-y-auto">
                  {composeAttachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-1 bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700">
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <button onClick={() => removeAttachment(index)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
                <button
                  onClick={handleSendEmail}
                  disabled={sending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded text-sm font-medium flex items-center gap-2"
                >
                  {sending ? 'Sending...' : 'Send'}
                  <Send className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    multiple
                  />
                  <button
                    onClick={handleAttachmentClick}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Attach file"
                  >
                    <Paperclip className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Trash2 className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}