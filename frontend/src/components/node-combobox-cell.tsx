'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Check, Plus, Hash } from 'lucide-react';

export interface NodeComboboxCellProps {
  value: string;
  options: string[];
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  isInvalid?: boolean;
  disabled?: boolean;
  widthClass?: string;
}

/**
 * Searchable & filterable combobox cell for From Node & To Node.
 * Offers node choices dynamically extracted from the Cable list (and branch segments)
 * while still allowing free typing of custom junction nodes.
 */
export function NodeComboboxCell({
  value: initialValue,
  options = [],
  onSave,
  placeholder = 'Node...',
  className = '',
  isInvalid = false,
  disabled = false,
  widthClass = 'w-32',
}: NodeComboboxCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [val, setVal] = useState(initialValue ?? '');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!isTypingRef.current) {
      setVal(initialValue ?? '');
    }
  }, [initialValue]);

  // Detect whether to open upwards or downwards depending on viewport space
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 230 && rect.top > 230) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Filter options based on typed input
  const filteredOptions = useMemo(() => {
    const q = val.trim().toLowerCase();
    if (!q) return options;
    return options.filter(opt => opt.toLowerCase().includes(q));
  }, [options, val]);

  const commitValue = useCallback(
    (nextVal: string) => {
      isTypingRef.current = false;
      const trimmed = nextVal.trim();
      if (trimmed !== (initialValue ?? '')) {
        onSave(trimmed);
      }
    },
    [initialValue, onSave]
  );

  // Click outside listener to close dropdown and commit
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        commitValue(val);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, val, commitValue]);

  const handleSelectOption = (option: string) => {
    setVal(option);
    commitValue(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isTypingRef.current = true;
    const nextVal = e.target.value;
    setVal(nextVal);
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex(prev => {
          const next = prev + 1;
          return next < filteredOptions.length ? next : 0;
        });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(filteredOptions.length - 1);
      } else {
        setHighlightedIndex(prev => {
          const next = prev - 1;
          return next >= 0 ? next : filteredOptions.length - 1;
        });
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelectOption(filteredOptions[highlightedIndex]);
      } else {
        commitValue(val);
        setIsOpen(false);
        inputRef.current?.blur();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setVal(initialValue ?? '');
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Tab') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelectOption(filteredOptions[highlightedIndex]);
      } else {
        commitValue(val);
        setIsOpen(false);
      }
    }
  };

  // Keep highlighted item visible when navigating via arrow keys
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item && typeof item.scrollIntoView === 'function') {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const hasExactMatch = options.some(opt => opt.toLowerCase() === val.trim().toLowerCase());

  return (
    <div ref={containerRef} className={`relative inline-block ${widthClass}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={val}
          disabled={disabled}
          placeholder={placeholder}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className={`h-7 pr-6 text-xs px-2 rounded font-medium border transition-colors outline-none w-full ${
            isInvalid
              ? 'border-red-400 bg-red-50 text-red-800'
              : 'border-transparent hover:border-slate-300 focus:border-blue-500 bg-slate-100 text-slate-800 focus:bg-white'
          } ${className}`}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              setIsOpen(true);
              inputRef.current?.focus();
            }
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none"
          title="Toggle node list"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </button>
      </div>

      {/* Floating Dropdown List */}
      {isOpen && (
        <div
          className={`absolute left-0 ${
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          } w-52 max-h-56 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-100`}
        >
          <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <Hash className="w-3 h-3 text-blue-500" />
              Node Options ({filteredOptions.length})
            </span>
            {options.length > 0 && <span className="text-slate-400">From cables/branches</span>}
          </div>

          <ul ref={listRef} className="overflow-y-auto max-h-44 py-1 divide-y divide-slate-50">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt === val;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <li
                    key={opt}
                    onClick={() => handleSelectOption(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-2.5 py-1.5 text-xs flex items-center justify-between cursor-pointer font-mono select-none ${
                      isHighlighted
                        ? 'bg-blue-50 text-blue-900 font-semibold'
                        : isSelected
                        ? 'bg-slate-100/80 text-slate-900 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-2 text-xs text-slate-400 italic text-center">
                No matching nodes found
              </li>
            )}

            {/* Custom Node creation helper if user types a new node name */}
            {val.trim() && !hasExactMatch && (
              <li
                onClick={() => handleSelectOption(val.trim())}
                className="px-2.5 py-1.5 text-xs flex items-center gap-1.5 text-blue-600 hover:bg-blue-50 cursor-pointer font-medium border-t border-slate-100 bg-slate-50/50"
              >
                <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  Use custom node &ldquo;<strong className="font-mono">{val.trim()}</strong>&rdquo;
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
