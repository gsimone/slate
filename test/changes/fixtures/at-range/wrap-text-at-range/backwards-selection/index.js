
export default function (state) {
  const { document, selection } = state
  const texts = document.getTexts()
  const first = texts.first()
  const range = selection.merge({
    anchorKey: first.key,
    anchorOffset: 3,
    focusKey: first.key,
    focusOffset: 1,
    isBackward: true
  })

  return state
    .change()
    .wrapTextAtRange(range, '[[', ']]')
    .state
}
