
import Block from '../models/block'
import Character from '../models/character'
import Document from '../models/document'
import Inline from '../models/inline'
import Mark from '../models/mark'
import Node from '../models/node'
import Selection from '../models/selection'
import State from '../models/state'
import Text from '../models/text'
import isEmpty from 'is-empty'

/**
 * Raw.
 *
 * @type {Object}
 */

const Raw = {

  /**
   * Deserialize a JSON `object`.
   *
   * @param {Object} object
   * @param {Object} options (optional)
   * @return {State}
   */

  deserialize(object, options) {
    const state = Raw.deserializeState(object, options)
    return state
  },

  /**
   * Deserialize a JSON `object` representing a `Block`.
   *
   * @param {Object} object
   * @param {Object} options (optional)
   * @return {Block}
   */

  deserializeBlock(object, options = {}) {
    if (options.terse) object = Raw.untersifyBlock(object)

    const nodes = Node.createList(object.nodes.map(node => Raw.deserializeNode(node, options)))
    const block = Block.create({
      key: object.key,
      type: object.type,
      data: object.data,
      isVoid: object.isVoid,
      nodes,
    })

    return block
  },

  /**
   * Deserialize a JSON `object` representing a `Document`.
   *
   * @param {Object} object
   * @param {Object} options (optional)
   * @return {Document}
   */

  deserializeDocument(object, options) {
    const nodes = object.nodes.map(node => Raw.deserializeNode(node, options))
    const document = Document.create({
      key: object.key,
      data: object.data,
      nodes,
    })

    return document
  },

  /**
   * Deserialize a JSON `object` representing an `Inline`.
   *
   * @param {Object} object
   * @param {Object} options (optional)
   * @return {Inline}
   */

  deserializeInline(object, options = {}) {
    if (options.terse) object = Raw.untersifyInline(object)

    const nodes = object.nodes.map(node => Raw.deserializeNode(node, options))
    const inline = Inline.create({
      key: object.key,
      type: object.type,
      data: object.data,
      isVoid: object.isVoid,
      nodes,
    })

    return inline
  },

  /**
   * Deserialize a JSON `object` representing a `Mark`.
   *
   * @param {Object} object
   * @param {Object} options (optional)
   * @return {Mark}
   */

  deserializeMark(object, options) {
    const mark = Mark.create(object)
    return mark
  },

  /**
   * Deserialize a JSON object representing a `Node`.
   *
   * @param {Object} object
   * @param {Object} options (optional)
   * @return {Node}
   */

  deserializeNode(object, options) {
    switch (object.kind) {
      case 'block': return Raw.deserializeBlock(object, options)
      case 'document': return Raw.deserializeDocument(object, options)
      case 'inline': return Raw.deserializeInline(object, options)
      case 'text': return Raw.deserializeText(object, options)
      default: {
        throw new Error(`Unrecognized node kind "${object.kind}".`)
      }
    }
  },

  /**
   * Deserialize a JSON `object` representing a `Range`.
   *
   * @param {Object} object
   * @param {Object} options (optional)
   * @return {List<Character>}
   */

  deserializeRange(object, options = {}) {
    if (options.terse) object = Raw.untersifyRange(object)
    const marks = Mark.createSet(object.marks.map(mark => Raw.deserializeMark(mark, options)))
    const chars = object.text.split('')
    const characters = Character.createList(chars.map(text => ({ text, marks })))
    return characters
  },

  /**
   * Deserialize a JSON `object` representing a `Selection`.
   *
   * @param {Object} object
   * @param {Object} options (optional)
   * @return {State}
   */

  deserializeSelection(object, options = {}) {
    const selection = Selection.create({
      anchorKey: object.anchorKey,
      anchorOffset: object.anchorOffset,
      focusKey: object.focusKey,
      focusOffset: object.focusOffset,
      isFocused: object.isFocused,
    })

    return selection
  },

  /**
   * Deserialize a JSON `object` representing a `State`.
   *
   * @param {Object} object
   * @param {Object} options (optional)
   * @return {State}
   */

  deserializeState(object, options = {}) {
    if (options.terse) object = Raw.untersifyState(object)

    const document = Raw.deserializeDocument(object.document, options)
    let selection

    if (object.selection != null) {
      selection = Raw.deserializeSelection(object.selection, options)
    }

    return State.create({ data: object.data, document, selection }, options)
  },

  /**
   * Deserialize a JSON `object` representing a `Text`.
   *
   * @param {Object} object
   * @param {Object} options (optional)
   * @return {Text}
   */

  deserializeText(object, options = {}) {
    if (options.terse) object = Raw.untersifyText(object)

    const characters = object.ranges.reduce((list, range) => {
      return list.concat(Raw.deserializeRange(range, options))
    }, Character.createList())

    const text = Text.create({
      key: object.key,
      characters,
    })

    return text
  },

  /**
   * Serialize a `model`.
   *
   * @param {Mixed} model
   * @param {Object} options (optional)
   * @return {Object}
   */

  serialize(model, options) {
    const raw = Raw.serializeState(model, options)
    return raw
  },

  /**
   * Serialize a `block` node.
   *
   * @param {Block} block
   * @param {Object} options (optional)
   * @return {Object}
   */

  serializeBlock(block, options = {}) {
    const object = {
      data: block.data.toJSON(),
      key: block.key,
      kind: block.kind,
      isVoid: block.isVoid,
      type: block.type,
      nodes: block.nodes
        .toArray()
        .map(node => Raw.serializeNode(node, options))
    }

    if (!options.preserveKeys) {
      delete object.key
    }

    return options.terse
      ? Raw.tersifyBlock(object)
      : object
  },

  /**
   * Serialize a `document`.
   *
   * @param {Document} document
   * @param {Object} options (optional)
   * @return {Object}
   */

  serializeDocument(document, options = {}) {
    const object = {
      data: document.data.toJSON(),
      key: document.key,
      kind: document.kind,
      nodes: document.nodes
        .toArray()
        .map(node => Raw.serializeNode(node, options))
    }

    if (!options.preserveKeys) {
      delete object.key
    }

    return options.terse
      ? Raw.tersifyDocument(object)
      : object
  },

  /**
   * Serialize an `inline` node.
   *
   * @param {Inline} inline
   * @param {Object} options (optional)
   * @return {Object}
   */

  serializeInline(inline, options = {}) {
    const object = {
      data: inline.data.toJSON(),
      key: inline.key,
      kind: inline.kind,
      isVoid: inline.isVoid,
      type: inline.type,
      nodes: inline.nodes
        .toArray()
        .map(node => Raw.serializeNode(node, options))
    }

    if (!options.preserveKeys) {
      delete object.key
    }

    return options.terse
      ? Raw.tersifyInline(object)
      : object
  },

  /**
   * Serialize a `mark`.
   *
   * @param {Mark} mark
   * @param {Object} options (optional)
   * @return {Object}
   */

  serializeMark(mark, options = {}) {
    const object = {
      data: mark.data.toJSON(),
      kind: mark.kind,
      type: mark.type
    }

    return options.terse
      ? Raw.tersifyMark(object)
      : object
  },

  /**
   * Serialize a `node`.
   *
   * @param {Node} node
   * @param {Object} options (optional)
   * @return {Object}
   */

  serializeNode(node, options) {
    switch (node.kind) {
      case 'block': return Raw.serializeBlock(node, options)
      case 'document': return Raw.serializeDocument(node, options)
      case 'inline': return Raw.serializeInline(node, options)
      case 'text': return Raw.serializeText(node, options)
      default: {
        throw new Error(`Unrecognized node kind "${node.kind}".`)
      }
    }
  },

  /**
   * Serialize a `range`.
   *
   * @param {Range} range
   * @param {Object} options (optional)
   * @return {Object}
   */

  serializeRange(range, options = {}) {
    const object = {
      kind: range.kind,
      text: range.text,
      marks: range.marks
        .toArray()
        .map(mark => Raw.serializeMark(mark, options))
    }

    return options.terse
      ? Raw.tersifyRange(object)
      : object
  },

  /**
   * Serialize a `selection`.
   *
   * @param {Selection} selection
   * @param {Object} options (optional)
   * @return {Object}
   */

  serializeSelection(selection, options = {}) {
    const object = {
      kind: selection.kind,
      anchorKey: selection.anchorKey,
      anchorOffset: selection.anchorOffset,
      focusKey: selection.focusKey,
      focusOffset: selection.focusOffset,
      isBackward: selection.isBackward,
      isFocused: selection.isFocused,
    }

    return options.terse
      ? Raw.tersifySelection(object)
      : object
  },

  /**
   * Serialize a `state`.
   *
   * @param {State} state
   * @param {Object} options (optional)
   * @return {Object}
   */

  serializeState(state, options = {}) {
    const object = {
      document: Raw.serializeDocument(state.document, options),
      kind: state.kind
    }

    if (options.preserveSelection) {
      object.selection = Raw.serializeSelection(state.selection, options)
    }

    if (options.preserveStateData) {
      object.data = state.data.toJSON()
    }

    const ret = options.terse
      ? Raw.tersifyState(object)
      : object

    return ret
  },

  /**
   * Serialize a `text` node.
   *
   * @param {Text} text
   * @param {Object} options (optional)
   * @return {Object}
   */

  serializeText(text, options = {}) {
    const object = {
      key: text.key,
      kind: text.kind,
      ranges: text
        .getRanges()
        .toArray()
        .map(range => Raw.serializeRange(range, options))
    }

    if (!options.preserveKeys) {
      delete object.key
    }

    return options.terse
      ? Raw.tersifyText(object)
      : object
  },

  /**
   * Create a terse representation of a block `object`.
   *
   * @param {Object} object
   * @return {Object}
   */

  tersifyBlock(object) {
    const ret = {}
    ret.kind = object.kind
    ret.type = object.type
    if (object.key) ret.key = object.key
    if (!object.isVoid) ret.nodes = object.nodes
    if (object.isVoid) ret.isVoid = object.isVoid
    if (!isEmpty(object.data)) ret.data = object.data
    return ret
  },

  /**
   * Create a terse representation of a document `object.
   *
   * @param {Object} object
   * @return {Object}
   */

  tersifyDocument(object) {
    const ret = {}
    ret.nodes = object.nodes
    if (object.key) ret.key = object.key
    if (!isEmpty(object.data)) ret.data = object.data
    return ret
  },

  /**
   * Create a terse representation of a inline `object`.
   *
   * @param {Object} object
   * @return {Object}
   */

  tersifyInline(object) {
    const ret = {}
    ret.kind = object.kind
    ret.type = object.type
    if (object.key) ret.key = object.key
    if (!object.isVoid) ret.nodes = object.nodes
    if (object.isVoid) ret.isVoid = object.isVoid
    if (!isEmpty(object.data)) ret.data = object.data
    return ret
  },

  /**
   * Create a terse representation of a mark `object`.
   *
   * @param {Object} object
   * @return {Object}
   */

  tersifyMark(object) {
    const ret = {}
    ret.type = object.type
    if (!isEmpty(object.data)) ret.data = object.data
    return ret
  },

  /**
   * Create a terse representation of a range `object`.
   *
   * @param {Object} object
   * @return {Object}
   */

  tersifyRange(object) {
    const ret = {}
    ret.text = object.text
    if (!isEmpty(object.marks)) ret.marks = object.marks
    return ret
  },

  /**
   * Create a terse representation of a selection `object.`
   *
   * @param {Object} object
   * @return {Object}
   */

  tersifySelection(object) {
    return {
      anchorKey: object.anchorKey,
      anchorOffset: object.anchorOffset,
      focusKey: object.focusKey,
      focusOffset: object.focusOffset,
      isFocused: object.isFocused,
    }
  },

  /**
   * Create a terse representation of a state `object`.
   *
   * @param {Object} object
   * @return {Object}
   */

  tersifyState(object) {
    const { data, document, selection } = object
    const emptyData = isEmpty(data)

    if (!selection && emptyData) {
      return document
    }

    const ret = { document }
    if (!emptyData) ret.data = data
    if (selection) ret.selection = selection
    return ret
  },

  /**
   * Create a terse representation of a text `object`.
   *
   * @param {Object} object
   * @return {Object}
   */

  tersifyText(object) {
    const ret = {}
    ret.kind = object.kind
    if (object.key) ret.key = object.key

    if (object.ranges.length == 1 && object.ranges[0].marks == null) {
      ret.text = object.ranges[0].text
    } else {
      ret.ranges = object.ranges
    }

    return ret
  },

  /**
   * Convert a terse representation of a block `object` into a non-terse one.
   *
   * @param {Object} object
   * @return {Object}
   */

  untersifyBlock(object) {
    if (object.isVoid || !object.nodes || !object.nodes.length) {
      return {
        key: object.key,
        data: object.data,
        kind: object.kind,
        type: object.type,
        isVoid: object.isVoid,
        nodes: [
          {
            kind: 'text',
            text: ''
          }
        ]
      }
    }

    return object
  },

  /**
   * Convert a terse representation of a inline `object` into a non-terse one.
   *
   * @param {Object} object
   * @return {Object}
   */

  untersifyInline(object) {
    if (object.isVoid || !object.nodes || !object.nodes.length) {
      return {
        key: object.key,
        data: object.data,
        kind: object.kind,
        type: object.type,
        isVoid: object.isVoid,
        nodes: [
          {
            kind: 'text',
            text: ''
          }
        ]
      }
    }

    return object
  },

  /**
   * Convert a terse representation of a range `object` into a non-terse one.
   *
   * @param {Object} object
   * @return {Object}
   */

  untersifyRange(object) {
    return {
      kind: 'range',
      text: object.text,
      marks: object.marks || []
    }
  },

  /**
   * Convert a terse representation of a selection `object` into a non-terse one.
   *
   * @param {Object} object
   * @return {Object}
   */

  untersifySelection(object) {
    return {
      kind: 'selection',
      anchorKey: object.anchorKey,
      anchorOffset: object.anchorOffset,
      focusKey: object.focusKey,
      focusOffset: object.focusOffset,
      isBackward: null,
      isFocused: false
    }
  },

  /**
   * Convert a terse representation of a state `object` into a non-terse one.
   *
   * @param {Object} object
   * @return {Object}
   */

  untersifyState(object) {
    if (object.document) {
      return {
        kind: 'state',
        data: object.data,
        document: object.document,
        selection: object.selection,
      }
    }

    return {
      kind: 'state',
      document: {
        data: object.data,
        key: object.key,
        kind: 'document',
        nodes: object.nodes
      }
    }
  },

  /**
   * Convert a terse representation of a text `object` into a non-terse one.
   *
   * @param {Object} object
   * @return {Object}
   */

  untersifyText(object) {
    if (object.ranges) return object

    return {
      key: object.key,
      kind: object.kind,
      ranges: [{
        text: object.text,
        marks: object.marks || []
      }]
    }
  }
}

/**
 * Export.
 *
 * @type {Object}
 */

export default Raw
