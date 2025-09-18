"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  Link,
  MessageSquare,
  FileText,
  Send,
  Plus,
  Menu,
  User,
  Bot,
  X,
  Moon,
  Sun,
} from "lucide-react";
import { MessageContent } from "./components/MessageContent";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastContainer, useToast } from "./components/ErrorToast";

// Utility functions for timestamps
const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDateHeader = (timestamp: string) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
};

const shouldShowDateHeader = (messages: any[], currentIndex: number) => {
  if (currentIndex === 0) return true;

  const currentMessage = messages[currentIndex];
  const previousMessage = messages[currentIndex - 1];

  const currentDate = new Date(currentMessage.timestamp).toDateString();
  const previousDate = new Date(previousMessage.timestamp).toDateString();

  return currentDate !== previousDate;
};

interface Chat {
  id: string;
  title: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>;
  documentId: string | null;
  documentName?: string;
  documentType?: "file" | "url";
  documentUrl?: string;
  isProcessing?: boolean;
  createdAt: Date;
}

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toasts, removeToast, showError, showSuccess, showWarning } =
    useToast();

  const activeChat = chats.find((chat) => chat.id === activeChatId);

  // Dark mode toggle with animation
  const toggleDarkMode = () => {
    if (isAnimating) return; // Prevent multiple clicks during animation

    setIsAnimating(true);

    // Add animation classes to trigger effects
    const toggleButtons = document.querySelectorAll(".dark-mode-toggle");
    const pageElement = document.querySelector(".page-transition");

    toggleButtons.forEach((button) => {
      button.classList.add("animate");
    });

    if (pageElement) {
      pageElement.classList.add("theme-changing");
    }

    // Delay the actual mode change to allow animation to start
    setTimeout(() => {
      const newDarkMode = !isDarkMode;
      setIsDarkMode(newDarkMode);

      if (newDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      localStorage.setItem("darkMode", newDarkMode.toString());

      // Remove animation classes after transition completes
      setTimeout(() => {
        toggleButtons.forEach((button) => {
          button.classList.remove("animate");
        });
        if (pageElement) {
          pageElement.classList.remove("theme-changing");
        }
        setIsAnimating(false);
      }, 800);
    }, 100);
  };

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    setIsDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  useEffect(() => {
    // Initialize textarea height and scrollbar state
    if (inputRef.current) {
      const textarea = inputRef.current;
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";

      if (textarea.scrollHeight > 200) {
        textarea.style.overflowY = "auto";
      } else {
        textarea.style.overflowY = "hidden";
      }
    }
  }, [currentQuery]);

  const createNewChat = () => {
    if (chats.length >= 3) {
      setShowDeleteModal(true);
      return;
    }

    // Just show the upload modal without creating a chat yet
    setShowUploadModal(true);
  };

  const deleteChat = async (chatId: string) => {
    const chatToDelete = chats.find((chat) => chat.id === chatId);

    // Clean up server-side resources if document exists
    if (chatToDelete?.documentId) {
      try {
        await fetch(`/api/cleanup/${chatToDelete.documentId}`, {
          method: "DELETE",
        });
      } catch (error) {
        console.error("Failed to cleanup document:", error);
      }
    }

    setChats((prev) => prev.filter((chat) => chat.id !== chatId));
    if (activeChatId === chatId) {
      const remainingChats = chats.filter((chat) => chat.id !== chatId);
      setActiveChatId(remainingChats.length > 0 ? remainingChats[0].id : null);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showError(
        "File Too Large",
        "File size must be less than 10MB. Please choose a smaller file."
      );
      return;
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      showError(
        "Invalid File Type",
        "Only PDF and DOCX files are supported. Please choose a valid file."
      );
      return;
    }

    // Create new chat only when file is actually uploaded
    const newChat: Chat = {
      id: Date.now().toString(),
      title: file.name,
      messages: [],
      documentId: null,
      documentName: file.name,
      documentType: "file",
      isProcessing: true,
      createdAt: new Date(),
    };

    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === newChat.id
              ? {
                  ...chat,
                  documentId: result.documentId,
                  isProcessing: false,
                  messages: [
                    {
                      role: "assistant",
                      content:
                        "Document uploaded and processed successfully! You can now ask questions about it.",
                      timestamp: new Date().toISOString(),
                    },
                  ],
                }
              : chat
          )
        );
        setShowUploadModal(false);
        showSuccess(
          "Upload Successful",
          "Your document has been processed and is ready for questions."
        );
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("File upload error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === newChat.id
            ? {
                ...chat,
                isProcessing: false,
                messages: [
                  {
                    role: "assistant",
                    content: `Upload failed: ${errorMessage}`,
                    timestamp: new Date().toISOString(),
                  },
                ],
              }
            : chat
        )
      );

      // Show user-friendly error message
      if (errorMessage.includes("timeout")) {
        showError(
          "Upload Timeout",
          "The upload took too long. Please try again with a smaller file."
        );
      } else if (
        errorMessage.includes("corrupted") ||
        errorMessage.includes("password-protected")
      ) {
        showError(
          "File Issue",
          "The file appears to be corrupted or password-protected. Please try a different file."
        );
      } else if (errorMessage.includes("size")) {
        showError(
          "File Too Large",
          "The file is too large. Please choose a smaller file (max 10MB)."
        );
      } else {
        showError(
          "Upload Failed",
          "Failed to upload the document. Please check your file and try again."
        );
      }
    } finally {
      setIsProcessing(false);
      // Reset the file input
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleUrlSubmit = async (url: string) => {
    if (!url) return;

    // Validate URL format
    try {
      new URL(url);
    } catch {
      showError(
        "Invalid URL",
        "Please enter a valid URL (e.g., https://example.com)"
      );
      return;
    }

    // Create new chat only when URL is actually submitted
    const newChat: Chat = {
      id: Date.now().toString(),
      title: new URL(url).hostname,
      messages: [],
      documentId: null,
      documentName: url,
      documentType: "url",
      documentUrl: url,
      isProcessing: true,
      createdAt: new Date(),
    };

    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setIsProcessing(true);

    try {
      const response = await fetch("/api/process-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === newChat.id
              ? {
                  ...chat,
                  documentId: result.documentId,
                  isProcessing: false,
                  messages: [
                    {
                      role: "assistant",
                      content:
                        "URL processed successfully! You can now ask questions about the content.",
                      timestamp: new Date().toISOString(),
                    },
                  ],
                }
              : chat
          )
        );
        setShowUploadModal(false);
        showSuccess(
          "URL Processed",
          "The webpage has been processed and is ready for questions."
        );
      } else {
        throw new Error(result.error || "URL processing failed");
      }
    } catch (error) {
      console.error("URL processing error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === newChat.id
            ? {
                ...chat,
                isProcessing: false,
                messages: [
                  {
                    role: "assistant",
                    content: `URL processing failed: ${errorMessage}`,
                    timestamp: new Date().toISOString(),
                  },
                ],
              }
            : chat
        )
      );

      // Show user-friendly error message
      if (errorMessage.includes("404")) {
        showError(
          "Page Not Found",
          "The URL you provided could not be found. Please check the URL and try again."
        );
      } else if (errorMessage.includes("403")) {
        if (errorMessage.includes("Cloudflare")) {
          showError(
            "Cloudflare Protection",
            "This website is protected by Cloudflare and cannot be accessed automatically. Please try a different URL."
          );
        } else {
          showError(
            "Access Denied",
            "The website blocked our request. This might be due to anti-bot protection. Please try a different URL."
          );
        }
      } else if (errorMessage.includes("timeout")) {
        showError(
          "Request Timeout",
          "The website took too long to respond. Please try again later."
        );
      } else if (
        errorMessage.includes("ENOTFOUND") ||
        errorMessage.includes("ECONNREFUSED")
      ) {
        showError(
          "Connection Failed",
          "Could not reach the website. Please check the URL and your internet connection."
        );
      } else if (errorMessage.includes("HTML content")) {
        showError(
          "Invalid Content",
          "The URL does not contain a valid webpage. Please try a different URL."
        );
      } else {
        showError(
          "Processing Failed",
          "Failed to process the URL. Please check the URL and try again."
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuery = async () => {
    if (!currentQuery.trim() || !activeChat?.documentId || !activeChatId)
      return;

    // Check if any chat is currently processing
    const isAnyChatProcessing = chats.some((chat) => chat.isProcessing);
    if (isAnyChatProcessing) {
      alert(
        "Please wait for the current query to complete before starting a new one."
      );
      return;
    }

    const userMessage = {
      role: "user" as const,
      content: currentQuery,
      timestamp: new Date().toISOString(),
    };

    // Add user message to chat and set processing state
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? {
              ...chat,
              messages: [...chat.messages, userMessage],
              isProcessing: true,
            }
          : chat
      )
    );

    setCurrentQuery("");

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userMessage.content,
          documentId: activeChat.documentId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === activeChatId
              ? {
                  ...chat,
                  messages: [
                    ...chat.messages,
                    {
                      role: "assistant",
                      content: result.answer,
                      timestamp: new Date().toISOString(),
                    },
                  ],
                  isProcessing: false,
                }
              : chat
          )
        );
      } else {
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === activeChatId
              ? {
                  ...chat,
                  messages: [
                    ...chat.messages,
                    {
                      role: "assistant",
                      content: `Error: ${result.error}`,
                      timestamp: new Date().toISOString(),
                    },
                  ],
                  isProcessing: false,
                }
              : chat
          )
        );
      }
    } catch (error) {
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  {
                    role: "assistant",
                    content: "Error processing query. Please try again.",
                    timestamp: new Date().toISOString(),
                  },
                ],
                isProcessing: false,
              }
            : chat
        )
      );
    }
  };

  // Main Chat Interface
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 page-transition">
      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? "w-64" : "w-0"
        } transition-all duration-300 bg-slate-800 dark:bg-slate-900 text-white overflow-hidden`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Docugent</h2>
            <button
              onClick={() => setShowSidebar(false)}
              className="text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>
          </div>
          <button
            onClick={createNewChat}
            className="w-full flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg mb-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </button>

          {/* Chat History */}
          <div className="space-y-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer group ${
                  activeChatId === chat.id ? "bg-gray-700" : "hover:bg-gray-800"
                }`}
                onClick={() => setActiveChatId(chat.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{chat.title}</p>
                  <p className="text-xs text-gray-400">
                    {chat.messages.length} messages
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 flex items-center justify-between transition-all duration-300">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-600 dark:text-gray-300"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {activeChat?.title || "Docugent"}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleDarkMode}
              disabled={isAnimating}
              className="dark-mode-toggle p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-600 dark:text-gray-300 relative overflow-hidden"
            >
              <span className="icon relative z-10">
                {isDarkMode ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 bg-white dark:bg-slate-800 transition-all duration-300">
          <div className="max-w-3xl mx-auto space-y-6">
            {!activeChat && (
              <div className="text-center py-12">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Welcome to Docugent
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Upload a document or provide a URL to start asking questions
                </p>
                <button
                  onClick={createNewChat}
                  className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Document
                </button>
              </div>
            )}

            {activeChat?.messages.map((message, index) => (
              <div key={index}>
                {/* Date Header */}
                {shouldShowDateHeader(activeChat.messages, index) && (
                  <div className="flex justify-center my-4">
                    <div className="bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-medium">
                      {formatDateHeader(message.timestamp)}
                    </div>
                  </div>
                )}

                {/* Message */}
                <div
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className="flex items-start space-x-3 max-w-[80%]">
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <div
                        className={`${
                          message.role === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white"
                        } rounded-2xl px-4 py-3 transition-all duration-300`}
                      >
                        <MessageContent
                          content={message.content}
                          isUser={message.role === "user"}
                        />
                      </div>
                      {/* Timestamp */}
                      <div
                        className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${
                          message.role === "user" ? "text-right" : "text-left"
                        }`}
                      >
                        {formatTimestamp(message.timestamp)}
                      </div>
                    </div>
                    {message.role === "user" && (
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {activeChat?.isProcessing && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-2xl px-4 py-3 transition-all duration-300">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900 dark:text-white">
                        Docugent is typing...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-4 transition-all duration-300">
          <div className="max-w-3xl mx-auto">
            {!activeChat?.documentId && activeChat && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Upload a document or provide a URL to start asking questions
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload Document
                </button>
              </div>
            )}

            {activeChat?.documentId && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {activeChat.documentType === "file" ? (
                      <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <Link className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    )}
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {activeChat.documentType === "file"
                        ? `File: ${activeChat.documentName}`
                        : `URL: ${activeChat.documentUrl}`}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            <div className="relative group">
              <textarea
                ref={inputRef}
                value={currentQuery}
                onChange={(e) => setCurrentQuery(e.target.value)}
                placeholder={
                  activeChat?.isProcessing
                    ? "Docugent is processing your request..."
                    : activeChat?.documentId
                    ? "Message Docugent..."
                    : "Upload a document first to start chatting..."
                }
                disabled={!activeChat?.documentId || activeChat?.isProcessing}
                className="w-full px-4 py-3 pr-14 border border-gray-300 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:bg-gray-100 dark:disabled:bg-slate-700 bg-white dark:bg-slate-800 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                rows={1}
                style={{
                  minHeight: "48px",
                  maxHeight: "200px",
                  fontSize: "16px",
                  lineHeight: "1.5",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#d1d5db transparent",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleQuery();
                  }
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  const newHeight = Math.min(target.scrollHeight, 200);
                  target.style.height = newHeight + "px";

                  // Show scrollbar only when content exceeds max height
                  if (target.scrollHeight > 200) {
                    target.style.overflowY = "auto";
                  } else {
                    target.style.overflowY = "hidden";
                  }
                }}
              />
              <button
                onClick={handleQuery}
                disabled={
                  !currentQuery.trim() ||
                  activeChat?.isProcessing ||
                  !activeChat?.documentId
                }
                className="send-button absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-blue-500 text-white rounded-xl transition-all duration-200 flex items-center justify-center shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 z-10"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Docugent can make mistakes. Consider checking important
              information.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4 transition-all duration-300 transform scale-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Upload Document or URL
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex space-x-1 mb-6">
              <button
                onClick={() => setActiveTab("upload")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${
                  activeTab === "upload"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                }`}
              >
                <Upload size={16} />
                <span>Upload File</span>
              </button>
              <button
                onClick={() => setActiveTab("url")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${
                  activeTab === "url"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                }`}
              >
                <Link size={16} />
                <span>URL</span>
              </button>
            </div>

            {activeTab === "upload" && (
              <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-6 text-center bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-200">
                <FileText className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Upload a PDF or DOCX file
                </p>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                >
                  {isProcessing ? "Processing..." : "Choose File"}
                </label>
              </div>
            )}

            {activeTab === "url" && (
              <UrlInput
                onSubmit={handleUrlSubmit}
                isProcessing={isProcessing}
              />
            )}
          </div>
        </div>
      )}

      {/* Delete Chat Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4 transition-all duration-300 transform scale-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Maximum Chats Reached
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              You can only have 3 active chats at a time. Please delete an
              existing chat to create a new one.
            </p>

            <div className="space-y-2 mb-4">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-900 dark:text-white">
                      {chat.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {chat.messages.length} messages
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      deleteChat(chat.id);
                      setShowDeleteModal(false);
                    }}
                    className="ml-2 px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function UrlInput({
  onSubmit,
  isProcessing,
}: {
  onSubmit: (url: string) => void;
  isProcessing: boolean;
}) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(url);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="url"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Enter URL
        </label>
        <input
          type="url"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/document"
          className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg"
          required
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Note: Some websites with anti-bot protection (like Cloudflare) may not
          be accessible.
        </p>
      </div>
      <button
        type="submit"
        disabled={isProcessing || !url.trim()}
        className="w-full px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500 transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 font-medium"
      >
        {isProcessing ? "Processing..." : "Process URL"}
      </button>
    </form>
  );
}
