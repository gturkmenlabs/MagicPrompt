import React, { useState } from 'react';
import { useTranslation } from '../i18n';

interface CustomTemplateBuilderProps {
    onSave?: (template: { name: string; content: string; category: string }) => void;
    onClose?: () => void;
}

export default function CustomTemplateBuilder({ onSave, onClose }: CustomTemplateBuilderProps) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('general');

    const handleSave = () => {
        if (onSave && name && content) {
            onSave({ name, content, category });
        }
    };

    return (
        <div className="p-6 bg-gray-900 rounded-xl border border-gray-700">
            <h2 className="text-xl font-bold text-cyan-400 mb-4">Custom Template Builder</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Template Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2"
                        placeholder="Enter template name..."
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2"
                    >
                        <option value="general">General</option>
                        <option value="coding">Coding</option>
                        <option value="writing">Writing</option>
                        <option value="analysis">Analysis</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Template Content</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 min-h-[200px] font-mono"
                        placeholder="Write your template prompt here..."
                    />
                </div>
                <div className="flex gap-3 justify-end">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={!name || !content}
                        className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 transition disabled:opacity-50"
                    >
                        Save Template
                    </button>
                </div>
            </div>
        </div>
    );
}
