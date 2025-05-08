// src/components/CommentsPanel.js
import React, {useContext, useEffect, useState} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEdit, FaTrash, FaCheck } from 'react-icons/fa';
import { getAbsoluteURL }   from '../utils/utils';
import { API_ENDPOINTS }    from '../constants';
import { AuthContext }      from '../AuthContext';
import './CommentsPanel.css';

export default function CommentsPanel({ metricId }) {
  const { user } = useContext(AuthContext);
  const [comments, setComments] = useState([]);
  const [newText, setNewText]   = useState('');

  useEffect(() => {
    fetch(getAbsoluteURL(API_ENDPOINTS.commentsByMetric(metricId)), {
      credentials: 'include'
    })
    .then(res => res.json())
    .then(setComments)
    .catch(console.error);
  }, [metricId]);

  const addComment = async () => {
    if (!newText.trim()) return;
    const res = await fetch(
      getAbsoluteURL(API_ENDPOINTS.commentsByMetric(metricId)),
      {
        method: 'POST',
        credentials: 'include',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ text: newText.trim() })
      }
    );
    if (res.ok) {
     const created = await res.json(); // просто добавляем ответ от сервера, он уже содержит userId и user
        setComments(prev => [...prev, created]);
      setNewText('');
    }
  };

  const saveComment = async (id, text) => {
    const res = await fetch(
      getAbsoluteURL(API_ENDPOINTS.updateComment(id)),
      {
        method: 'PUT',
        credentials: 'include',
        headers: {'Content-Type':'application/json'},
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
      { method: 'DELETE', credentials: 'include' }
    );
    if (res.ok) {
      setComments(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <div className="comments-panel">
      <h3>Комментарии</h3>
      <div className="comments-list">
        {comments.map(c => (
          <CommentItem
            key={c.id}
            comment={c}
            isOwn={user && c.userId === user.id}
            onSave={saveComment}
            onDelete={deleteComment}
          />
        ))}
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
  const [text, setText]       = useState(comment.text);

  return (
    <div className="comment-item">
      <div className="comment-header">
        <span className="comment-user">{comment.user}</span>
        <span className="comment-time">
          {new Date(comment.createdAt).toLocaleString()}
        </span>
        {isOwn && (
          <div className="comment-controls">
            <AnimatePresence>
              {!editing && (
                <motion.span
                  className="icon-button"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setEditing(true)}
                >
                  <FaEdit />
                </motion.span>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {editing && (
                <motion.span
                  className="icon-button check-button"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={() => {
                    onSave(comment.id, text);
                    setEditing(false);
                  }}
                >
                  <FaCheck />
                </motion.span>
              )}
            </AnimatePresence>

            <motion.span
              className="icon-button"
              whileHover={{ rotate: 90 }}
              onClick={() => onDelete(comment.id)}
            >
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
