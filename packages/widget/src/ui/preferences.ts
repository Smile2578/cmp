import type { ConsentCategories, WidgetConfig } from '../types'

export function createPreferences(
  config: WidgetConfig,
  onSave: (categories: ConsentCategories) => void
): HTMLElement {
  const panel = document.createElement('div')
  panel.className = 'cmp-preferences'
  panel.setAttribute('data-cmp-preferences', '')
  panel.style.display = 'none'

  for (const cat of (config.categories ?? [])) {
    const row = document.createElement('div')
    row.className = 'cmp-category'

    const info = document.createElement('div')
    info.className = 'cmp-category-info'

    const label = document.createElement('div')
    label.className = 'cmp-category-label'
    label.textContent = cat.label_fr

    const desc = document.createElement('div')
    desc.className = 'cmp-category-desc'
    desc.textContent = cat.description_fr

    info.appendChild(label)
    info.appendChild(desc)

    const toggle = document.createElement('label')
    toggle.className = 'cmp-toggle'

    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('data-cmp-toggle', cat.key)
    if (cat.is_essential) {
      input.checked = true
      input.disabled = true
    }

    const track = document.createElement('span')
    track.className = 'cmp-toggle-track'

    toggle.appendChild(input)
    toggle.appendChild(track)

    row.appendChild(info)
    row.appendChild(toggle)
    panel.appendChild(row)
  }

  const saveRow = document.createElement('div')
  saveRow.className = 'cmp-save-row'

  const saveBtn = document.createElement('button')
  saveBtn.className = 'cmp-btn-primary'
  saveBtn.setAttribute('data-cmp-save', '')
  saveBtn.textContent = 'Enregistrer mes choix'
  saveBtn.addEventListener('click', () => {
    const categories: ConsentCategories = {
      essential: true,
      analytics: (panel.querySelector('[data-cmp-toggle="analytics"]') as HTMLInputElement)?.checked ?? false,
      marketing: (panel.querySelector('[data-cmp-toggle="marketing"]') as HTMLInputElement)?.checked ?? false,
      functional: (panel.querySelector('[data-cmp-toggle="functional"]') as HTMLInputElement)?.checked ?? false
    }
    onSave(categories)
  })

  saveRow.appendChild(saveBtn)
  panel.appendChild(saveRow)

  return panel
}
