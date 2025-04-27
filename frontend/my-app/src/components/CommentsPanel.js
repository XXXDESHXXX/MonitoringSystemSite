// src/components/CommentsPanel.js
import React, { useEffect, useState } from 'react';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS }  from '../constants';
import { useAuth }        from '../AuthContext'; // чтобы узнать current user
import './CommentsPanel.css';

export default function CommentsPanel({ metricId }) {
  const [comments, setComments] = useState([]);
  const [newText, setNewText]   = useState('');
  const { user } = useAuth();   // { username, id, ... }

  // загрузка
  useEffect(() => {
    fetch(getAbsoluteURL(API_ENDPOINTS.commentsByMetric(metricId)), {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => setComments(data))
      .catch(console.error);
  }, [metricId]);

  // добавить
  const addComment = async () => {
    if (!newText.trim()) return;
    const res = await fetch(
      getAbsoluteURL(API_ENDPOINTS.commentsByMetric(metricId)),
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText })
      }
    );
    if (res.ok) {
      const created = await res.json();
      setComments(prev => [...prev, created]);
      setNewText('');
    }
  };

  // обновить
  const saveComment = async (id, text) => {
    const res = await fetch(
      getAbsoluteURL(API_ENDPOINTS.updateComment(id)),
      {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      }
    );
    if (res.ok) {
      const updated = await res.json();
      setComments(prev => prev.map(c => c.id === id ? { ...c, text: updated.text, updatedAt: updated.updatedAt } : c));
    }
  };

  // удалить
  const deleteComment = async (id) => {
    const res = await fetch(
      getAbsoluteURL(API_ENDPOINTS.updateComment(id)),
      {
        method: 'DELETE',
        credentials: 'include'
      }
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
            isOwn={c.userId === user.id}
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
        <button onClick={addComment} disabled={!newText.trim()}>Отправить</button>
      </div>
    </div>
  );
}

// Вложенный компонент для каждого комментария:
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
            {editing
              ? <button onClick={() => { onSave(comment.id, text); setEditing(false); }}>Сохранить</button>
              : <button onClick={() => setEditing(true)}>Изменить</button>
            }
            <button onClick={() => onDelete(comment.id)}>Удалить</button>
          </div>
        )}
      </div>
      {editing
        ? <textarea
            rows={2}
            value={text}
            onChange={e => setText(e.target.value)}
          />
        : <p className="comment-text">{comment.text}</p>
      }
    </div>
  );
}
