import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Loader, AlertCircle, Search, ChevronLeft } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient, Message as ApiMessage, MessageThread } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

type Message = ApiMessage & { isUser?: boolean };

interface ThreadDisplay {
  id: string;
  itemId: string;
  buyerId: string;
  sellerId: string;
  participantName: string;
  lastMessage: string;
  unreadCount: number;
  lastMessageTime?: string;
}

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const [threads, setThreads] = useState<ThreadDisplay[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // On narrow screens the list and the chat can't both fit; this toggles between
  // them (desktop shows both side by side regardless).
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryItemId = searchParams.get('itemId');
  const querySellerId = searchParams.get('sellerId');
  const canStartNewThread = Boolean(queryItemId && querySellerId && user && querySellerId !== user.id);

  // Load messages for selected thread
  const loadMessages = useCallback(async (threadId: string) => {
    try {
      const response = await apiClient.getMessages(threadId);
      const messageList = (response.data || []).map((msg: Message) => ({
        ...msg,
        isUser: msg.senderId === user?.id
      }));

      setMessages(messageList);
      await Promise.all(
        messageList
          .filter((msg) => !msg.isRead && msg.senderId !== user?.id)
          .map((msg) => apiClient.markMessageRead(msg.id))
      );
    } catch (err) {
      console.error('Load messages error:', err);
      // Don't set error state for messages, just log it
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedThreadId) {
      loadMessages(selectedThreadId);
    }
  }, [selectedThreadId, loadMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // A "contact seller" deep link should open the chat pane directly on mobile.
  useEffect(() => {
    if (canStartNewThread) setMobileChatOpen(true);
  }, [canStartNewThread]);

  // Fetch threads only. Selection is handled separately (see effect below) so
  // that the 3s background poll never yanks the user back to another thread.
  // `silent` skips the full-page loading spinner for background refreshes.
  const loadThreads = useCallback(async (silent = false) => {
    if (!user) {
      setThreads([]);
      setSelectedThreadId(null);
      setMessages([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      if (!silent) setLoading(true);
      setError(null);
      const response = await apiClient.getMessageThreads();
      const threadList = response.data || [];

      // Transform threads to include participant names
      const transformedThreads: ThreadDisplay[] = threadList.map((thread: MessageThread) => ({
        id: thread.id,
        itemId: thread.itemId,
        buyerId: thread.buyerId,
        sellerId: thread.sellerId,
        participantName: thread.item?.title || `Thread ${thread.id.slice(0, 8)}`,
        lastMessage: thread.lastMessage?.body || (lang === 'zh' ? '暂无消息' : 'No messages yet'),
        unreadCount: thread.unreadCount || 0,
        lastMessageTime: thread.lastMessage?.createdAt
      }));

      setThreads(transformedThreads);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(errorMsg);
      console.error('Load threads error:', err);
    } finally {
      setLoading(false);
    }
  }, [lang, user]);

  // Load all message threads on mount
  useEffect(() => {
    loadThreads();
  }, [loadThreads, user?.id]);

  // Auto-select a thread only when the user hasn't chosen one yet, so the poll
  // never overrides a manual selection. When arriving from "contact seller"
  // (itemId+sellerId) with no existing thread, stay unselected so the next send
  // starts a NEW thread with the intended seller instead of an unrelated one.
  useEffect(() => {
    if (selectedThreadId) return;
    if (queryItemId && querySellerId) {
      const matched = threads.find(
        (thread) => thread.itemId === queryItemId && thread.sellerId === querySellerId
      );
      if (matched) setSelectedThreadId(matched.id);
      return;
    }
    if (threads.length > 0) setSelectedThreadId(threads[0].id);
  }, [threads, selectedThreadId, queryItemId, querySellerId]);

  useEffect(() => {
    if (!user) return;

    const timer = window.setInterval(() => {
      loadThreads(true);
      if (selectedThreadId) {
        loadMessages(selectedThreadId);
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [user, selectedThreadId, loadThreads, loadMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      if (selectedThreadId) {
        await apiClient.sendMessage(selectedThreadId, newMessage);
      } else if (canStartNewThread && queryItemId && querySellerId) {
        await apiClient.sendMessage({
          itemId: queryItemId,
          recipientId: querySellerId,
          body: newMessage
        });
      } else {
        setError(lang === 'zh' ? '请先选择会话' : 'Please select a conversation first');
        return;
      }
      setNewMessage('');
      await loadThreads();
      if (selectedThreadId) {
        await loadMessages(selectedThreadId);
      } else {
        await loadThreads();
      }
    } catch (err) {
      console.error('Send message error:', err);
      setError(lang === 'zh' ? '发送消息失败' : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const filteredThreads = threads.filter((thread) =>
    (thread.participantName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedThread = threads.find(t => t.id === selectedThreadId);
  const showComposer = Boolean(selectedThread || canStartNewThread);

  return (
    <div className="flex h-[calc(100vh-48px)] bg-gradient-to-br from-emerald-50 via-cyan-50 to-sky-50">
      {/* Threads List Sidebar */}
      <div className={`${mobileChatOpen ? 'hidden' : 'flex'} md:flex w-full md:w-80 bg-white border-r border-emerald-200 shadow-lg overflow-hidden flex-col`}>
        {/* Header */}
        <div className="p-3 sm:p-6 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-cyan-50">
          <h2 className="text-xl sm:text-2xl font-bold text-emerald-800 mb-3 flex items-center gap-2">
            <MessageCircle className="h-5 sm:h-6 w-5 sm:w-6" />
            {lang === 'zh' ? '消息' : 'Messages'}
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-emerald-600" />
            <input
              type="text"
              placeholder={lang === 'zh' ? '搜索会话...' : 'Search conversations...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-emerald-200 focus:outline-none focus:border-emerald-500 bg-white"
            />
          </div>
        </div>

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{lang === 'zh' ? '正在加载会话...' : 'Loading conversations...'}</p>
              </div>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <MessageCircle className="h-12 w-12 mb-3 opacity-30 text-gray-400" />
              <p className="text-sm text-gray-500 text-center">{lang === 'zh' ? '暂无会话' : 'No conversations yet'}</p>
              <p className="text-xs text-gray-400 text-center mt-1">{lang === 'zh' ? '先联系卖家开始聊天' : 'Start by contacting a seller'}</p>
            </div>
          ) : (
            <div className="p-2">
              {filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => {
                    setSelectedThreadId(thread.id);
                    setMobileChatOpen(true);
                  }}
                  className={`w-full text-left p-4 rounded-lg mb-2 transition-colors ${
                    selectedThreadId === thread.id
                      ? 'bg-emerald-100 border-l-4 border-emerald-500'
                      : 'hover:bg-emerald-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex-shrink-0 bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm">
                      {(thread.participantName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-emerald-900 truncate">
                          {thread.participantName || (lang === 'zh' ? '未知用户' : 'Unknown User')}
                        </h3>
                        {thread.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2">
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-0.5">
                        {thread.lastMessage || 'No messages yet'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {thread.lastMessageTime || (lang === 'zh' ? '刚刚' : 'Now')}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${mobileChatOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-gradient-to-b from-cyan-50 to-emerald-50`}>
        {showComposer ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-emerald-200 bg-white shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileChatOpen(false)}
                  className="md:hidden -ml-1 rounded-lg p-1 text-emerald-700 hover:bg-emerald-50"
                  aria-label={lang === 'zh' ? '返回会话列表' : 'Back to conversations'}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white font-semibold">
                  {(selectedThread?.participantName || (lang === 'zh' ? '新会话' : 'New Chat')).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-900">
                    {selectedThread?.participantName || (lang === 'zh' ? '新会话' : 'New Conversation')}
                  </h3>
                </div>
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{lang === 'zh' ? '开始聊天吧' : 'Start a conversation'}</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.isUser
                          ? 'bg-emerald-500 text-white rounded-br-none'
                          : 'bg-white border border-emerald-200 text-emerald-900 rounded-bl-none'
                      }`}
                    >
                      <p className="break-words text-sm">
                        {message.body || ''}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          message.isUser ? 'text-emerald-100' : 'text-gray-400'
                        }`}
                      >
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Message Input */}
            <div className="p-6 border-t border-emerald-200 bg-white">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={selectedThread ? (lang === 'zh' ? '输入消息...' : 'Type your message...') : (lang === 'zh' ? '发送第一条消息以开始会话...' : 'Send first message to start this conversation...')}
                  disabled={sending}
                  className="flex-1 px-4 py-2 rounded-lg border border-emerald-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim() || (!selectedThread && !canStartNewThread)}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {sending ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{lang === 'zh' ? '请选择会话开始聊天' : 'Select a conversation to start messaging'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
