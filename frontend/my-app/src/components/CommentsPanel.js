// src/components/CommentsPanel.js
import React, { useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEdit, FaTrash, FaCheck, FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS } from '../constants';
import { AuthContext } from '../AuthContext';
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
  const { user, getAuthHeaders } = useContext(AuthContext);
  const [comments, setComments] = useState([]);
  const [newText, setNewText] = useState('');
  const [filterDays, setFilterDays] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    const params = filterDays ? `?days=${filterDays}` : '';
    fetch(getAbsoluteURL(API_ENDPOINTS.commentsByMetric(metricId) + params), {
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(data => {
        const sorted = [...data].sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
        setComments(sorted);
      })
      .catch(console.error);
  }, [metricId, filterDays, sortOrder, getAuthHeaders]);

  const addComment = async () => {
    if (!newText.trim()) return;
    const res = await fetch(
      getAbsoluteURL(API_ENDPOINTS.commentsByMetric(metricId)),
      {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: newText.trim() })
      }
    );
    if (res.ok) {
      const created = await res.json();
      setComments(prev => [{
        ...created,
        user: user.username,
        userId: user.id
      }, ...prev]);
      setNewText('');
    }
  };

  const saveComment = async (id, text) => {
    const res = await fetch(
      getAbsoluteURL(API_ENDPOINTS.updateComment(id)),
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text: text.trim() })
      }
    );
    if (res.ok) {
      const updated = await res.json();
      setComments(prev =>
        prev.map(c => c.id === id ? { ...c, text: updated.text, updatedAt: updated.updatedAt } : c)
      );
    }
  };

  const deleteComment = async (id) => {
    const res = await fetch(
      getAbsoluteURL(API_ENDPOINTS.updateComment(id)),
      { 
        method: 'DELETE', 
        headers: getAuthHeaders()
      }
    );
    if (res.ok) {
      setComments(prev => prev.filter(c => c.id !== id));
    }
  };

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
              onSave={saveComment}
              onDelete={deleteComment}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="comment-add">
        <textarea
          rows={2}
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Написать комментарий..."
        />
        <button onClick={addComment} disabled={!newText.trim()}>
          Отправить
        </button>
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
