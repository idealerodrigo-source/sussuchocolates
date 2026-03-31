import React, { useState, useRef, useEffect } from 'react';
import { MagnifyingGlass, X, CaretDown } from '@phosphor-icons/react';

/**
 * Componente de Select com busca/autocomplete
 * @param {Array} options - Lista de opções [{id, label, subtitle?}]
 * @param {string} value - Valor selecionado (id)
 * @param {function} onChange - Callback ao selecionar (recebe id)
 * @param {string} placeholder - Placeholder do input
 * @param {string} searchPlaceholder - Placeholder da busca
 * @param {boolean} disabled - Se está desabilitado
 * @param {string} emptyMessage - Mensagem quando não há resultados
 * @param {React.ReactNode} actionButton - Botão de ação (ex: "Novo Cliente")
 */
export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  disabled = false,
  emptyMessage = "Nenhum resultado encontrado",
  actionButton,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Opção selecionada
  const selectedOption = options.find(opt => opt.id === value);

  // Filtrar opções
  const filteredOptions = options.filter(opt => {
    const searchLower = search.toLowerCase();
    return (
      opt.label.toLowerCase().includes(searchLower) ||
      (opt.subtitle && opt.subtitle.toLowerCase().includes(searchLower))
    );
  });

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focar no input ao abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionId) => {
    onChange(optionId);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Container do seletor */}
      <div
        className={`w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg 
          flex items-center justify-between gap-2
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#8B5A3C]/50'}
          ${isOpen ? 'border-[#6B4423] ring-1 ring-[#6B4423]' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={`flex-1 truncate ${selectedOption ? 'text-[#3E2723]' : 'text-[#8B5A3C]'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear(e);
              }}
              className="p-0.5 hover:bg-[#E8D5C4] rounded transition-colors"
            >
              <X size={14} className="text-[#8B5A3C]" />
            </button>
          )}
          <CaretDown 
            size={16} 
            className={`text-[#8B5A3C] transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg shadow-lg overflow-hidden">
          {/* Campo de busca */}
          <div className="p-2 border-b border-[#8B5A3C]/15">
            <div className="relative">
              <MagnifyingGlass 
                size={18} 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B5A3C]" 
              />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 bg-[#F5E6D3]/30 border border-[#8B5A3C]/20 rounded-lg 
                  text-sm text-[#3E2723] placeholder-[#8B5A3C]/60
                  focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none"
              />
            </div>
          </div>

          {/* Lista de opções */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[#8B5A3C] text-center">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  className={`w-full px-4 py-2.5 text-left hover:bg-[#F5E6D3]/50 transition-colors
                    ${opt.id === value ? 'bg-[#F5E6D3]' : ''}`}
                >
                  <p className="text-sm font-medium text-[#3E2723] truncate">
                    {opt.label}
                  </p>
                  {opt.subtitle && (
                    <p className="text-xs text-[#8B5A3C] truncate">
                      {opt.subtitle}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Botão de ação (ex: Novo Cliente) */}
          {actionButton && (
            <div className="p-2 border-t border-[#8B5A3C]/15">
              {actionButton}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Componente de Input com busca/autocomplete para adicionar itens
 * @param {Array} options - Lista de opções [{id, label, subtitle?, extra?}]
 * @param {function} onSelect - Callback ao selecionar (recebe option completa)
 * @param {string} placeholder - Placeholder do input
 * @param {boolean} disabled - Se está desabilitado
 * @param {string} emptyMessage - Mensagem quando não há resultados
 * @param {React.ReactNode} actionButton - Botão de ação (ex: "Novo Produto")
 */
export function SearchableInput({
  options = [],
  onSelect,
  placeholder = "Digite para buscar...",
  disabled = false,
  emptyMessage = "Nenhum resultado encontrado",
  actionButton,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Filtrar opções
  const filteredOptions = search.length > 0 
    ? options.filter(opt => {
        const searchLower = search.toLowerCase();
        return (
          opt.label.toLowerCase().includes(searchLower) ||
          (opt.subtitle && opt.subtitle.toLowerCase().includes(searchLower))
        );
      })
    : options.slice(0, 10); // Mostra os primeiros 10 quando não há busca

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onSelect(option);
    setSearch('');
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setSearch(e.target.value);
    setIsOpen(true);
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Campo de busca */}
      <div className="relative">
        <MagnifyingGlass 
          size={18} 
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B5A3C]" 
        />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-9 pr-3 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg 
            text-[#3E2723] placeholder-[#8B5A3C]/60
            focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg shadow-lg overflow-hidden">
          {/* Lista de opções */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[#8B5A3C] text-center">
                {search ? emptyMessage : "Digite para buscar..."}
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className="w-full px-4 py-2.5 text-left hover:bg-[#F5E6D3]/50 transition-colors flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#3E2723] truncate">
                      {opt.label}
                    </p>
                    {opt.subtitle && (
                      <p className="text-xs text-[#8B5A3C] truncate">
                        {opt.subtitle}
                      </p>
                    )}
                  </div>
                  {opt.extra && (
                    <span className="text-sm font-semibold text-[#6B4423] ml-2">
                      {opt.extra}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Botão de ação (ex: Novo Produto) */}
          {actionButton && (
            <div className="p-2 border-t border-[#8B5A3C]/15">
              {actionButton}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
