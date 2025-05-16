// src/components/CommentsPanel.js
import React, { useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEdit, FaTrash, FaCheck, FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS } from '../constants';
import { useAuth } from '../AuthContext';
import './CommentsPanel.css';

const FILTER_OPTIONS = [
  { label: 'Все', value: '' },
  { label: 'За день', value: '1' },
  { label: 'За неделю', value: '7' },
  { label: 'За месяц', value: '30' }
];

const SORT_OPTIONS = [
  { label: 'Сначала новые', value: 'desc' },
  { label: 'Сначала старые', value: 'asc' }
];

export default function CommentsPanel({ metricId }) {
  const { getAuthHeaders, user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [filterDays, setFilterDays] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchComments() {
      try {
        setLoading(true);
        const res = await fetch(
          getAbsoluteURL(API_ENDPOINTS.commentsByMetric(metricId)),
          { headers: getAuthHeaders() }
        );
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        const sorted = [...data].sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
        setComments(sorted);
      } catch (err) {
        console.error('Error fetching comments:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (metricId) {
      fetchComments();
    }
  }, [metricId, getAuthHeaders, sortOrder]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await fetch(
        getAbsoluteURL(API_ENDPOINTS.commentsByMetric(metricId)),
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: newComment.trim() })
        }
      );

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const comment = await res.json();
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch (err) {
      console.error('Error posting comment:', err);
      setError(err.message);
    }
  };

  const handleEdit = async (commentId, newText) => {
    try {
      const res = await fetch(
        getAbsoluteURL(API_ENDPOINTS.updateComment(commentId)),
        {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: newText })
        }
      );

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const updatedComment = await res.json();
      setComments(prev =>
        prev.map(c => (c.id === commentId ? { ...c, ...updatedComment } : c))
      );
    } catch (err) {
      console.error('Error updating comment:', err);
      setError(err.message);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      const res = await fetch(
        getAbsoluteURL(API_ENDPOINTS.updateComment(commentId)),
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      );

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading comments...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="comments-panel">
      <h3>Комментарии</h3>

      <div className="comments-controls">
        <div className="comments-filter">
          <label>
            Показывать:&nbsp;
            <select value={filterDays} onChange={e => setFilterDays(e.target.value)}>
              {FILTER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="comments-sort">
          <label>
            Сортировка:&nbsp;
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <motion.span 
            className="sort-icon"
            animate={{ rotate: sortOrder === 'asc' ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />}
          </motion.span>
        </div>
      </div>

      <div className="comments-list">
        <AnimatePresence>
          {comments.map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              isOwn={user && c.userId === user.id}
              onSave={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="comment-add">
        <form onSubmit={handleSubmit}>
          <textarea
            rows={2}
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Написать комментарий..."
          />
          <button type="submit" disabled={!newComment.trim()}>
            Отправить
          </button>
        </form>
      </div>
    </div>
  );
}

function CommentItem({ comment, isOwn, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.text);

  return (
    <div className="comment-item">
      <div className="comment-header">
        <span className="comment-user">{comment.user}</span>
        <span className="comment-time">
          {new Date(comment.createdAt).toLocaleString()}
        </span>
        {isOwn && (
          <div className="comment-controls">
            {!editing && (
              <motion.span className="icon-button" whileHover={{ scale: 1.2 }} onClick={() => setEditing(true)}>
                <FaEdit />
              </motion.span>
            )}
            {editing && (
              <motion.span className="icon-button check-button" whileHover={{ scale: 1.2 }} onClick={() => { onSave(comment.id, text); setEditing(false); }}>
                <FaCheck />
              </motion.span>
            )}
            <motion.span className="icon-button" whileHover={{ rotate: 90 }} onClick={() => onDelete(comment.id)}>
              <FaTrash />
            </motion.span>
          </div>
        )}
      </div>

      {editing ? (
        <textarea
          rows={2}
          value={text}
          onChange={e => setText(e.target.value)}
          className="comment-edit-textarea"
        />
      ) : (
        <p className="comment-text">{comment.text}</p>
      )}
    </div>
  );
}
