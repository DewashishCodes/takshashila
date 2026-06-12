import React, { useEffect, useRef } from 'react'
import { EditorState, Extension, Annotation } from '@codemirror/state'
import {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, HighlightStyle, bracketMatching, indentOnInput } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'

interface Props {
  value: string
  readOnly?: boolean
  filename?: string
  onChange?: (value: string) => void
  onSave?: () => void
}

// Warm parchment-on-stone theme matching design tokens (CodeMirror needs
// concrete values at extension build time, so these mirror tokens.css)
const externalSync = Annotation.define<boolean>()

const courtTheme = EditorView.theme({
  '&': {
    backgroundColor: '#1A0E08',
    color: '#F5E6C8',
    fontSize: '12px',
    height: '100%'
  },
  '.cm-content': {
    fontFamily: "'JetBrains Mono', monospace",
    caretColor: '#F4C430'
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#F4C430' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(244, 196, 48, 0.25) !important'
  },
  '.cm-activeLine': { backgroundColor: 'rgba(244, 196, 48, 0.05)' },
  '.cm-gutters': {
    backgroundColor: '#2C1810',
    color: '#6B5040',
    border: 'none',
    borderRight: '1px solid #3D2314',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '10px'
  },
  '.cm-activeLineGutter': { backgroundColor: '#3D2314', color: '#A8861E' },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(244, 196, 48, 0.2)',
    outline: '1px solid #A8861E'
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { overflow: 'auto' }
}, { dark: true })

const courtHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#E05A2B' },
  { tag: [tags.string, tags.special(tags.string)], color: '#6AAE7A' },
  { tag: [tags.number, tags.bool, tags.null], color: '#FFD700' },
  { tag: tags.comment, color: '#8C7B6B', fontStyle: 'italic' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: '#F4C430' },
  { tag: [tags.typeName, tags.className], color: '#7BA3C9' },
  { tag: [tags.propertyName, tags.attributeName], color: '#BF8FBF' },
  { tag: tags.operator, color: '#A89070' },
  { tag: tags.heading, color: '#F4C430', fontWeight: 'bold' },
  { tag: tags.link, color: '#7BA3C9', textDecoration: 'underline' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold', color: '#FFD700' }
])

function languageFor(filename?: string): Extension {
  const ext = (filename ?? '').toLowerCase().split('.').pop() ?? ''
  switch (ext) {
    case 'js': case 'mjs': case 'cjs': case 'jsx':
      return javascript({ jsx: true })
    case 'ts': case 'mts': case 'cts': case 'tsx':
      return javascript({ jsx: true, typescript: true })
    case 'json': case 'jsonl':
      return json()
    case 'md': case 'markdown':
      return markdown()
    case 'html': case 'htm':
      return html()
    case 'css':
      return css()
    default:
      return []
  }
}

export default function Editor({ value, readOnly, filename, onChange, onSave }: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  // Refs keep the latest callbacks visible to extensions built once on mount
  const onChangeRef = useRef(onChange)
  const onSaveRef = useRef(onSave)
  onChangeRef.current = onChange
  onSaveRef.current = onSave

  useEffect(() => {
    if (!containerRef.current) return

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          indentOnInput(),
          bracketMatching(),
          courtTheme,
          syntaxHighlighting(courtHighlight),
          languageFor(filename),
          EditorState.readOnly.of(!!readOnly),
          keymap.of([
            {
              key: 'Mod-s',
              run: () => { onSaveRef.current?.(); return true }
            },
            indentWithTab,
            ...defaultKeymap,
            ...historyKeymap
          ]),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return
            // Programmatic syncs (external reloads) must not count as user edits
            if (update.transactions.some((tr) => tr.annotation(externalSync))) return
            onChangeRef.current?.(update.state.doc.toString())
          })
        ]
      }),
      parent: containerRef.current
    })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Recreated per file: parent renders <Editor key={path}> so value/filename
    // are fixed for the lifetime of one instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filename, readOnly])

  // External value replacement (e.g. async load finishing) — only applies when
  // the prop genuinely differs from the doc, so user typing is never clobbered
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (value !== current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
        annotations: externalSync.of(true)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', background: '#1A0E08' }} />
}
