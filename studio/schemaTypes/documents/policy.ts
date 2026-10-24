import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {defineField, defineType} from 'sanity'

import {policyTopics} from '../shared/options'

// Havenly's own policies. Policy answers in the app quote `body` word for word.
export const policy = defineType({
  name: 'policy',
  title: 'Policy',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({name: 'title', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'topic',
      type: 'string',
      options: {list: policyTopics, layout: 'dropdown'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'summary',
      type: 'string',
      description: 'One line for cards, e.g. "Full refund up to 7 days before check-in."',
      validation: (rule) => rule.required().max(90),
    }),
    defineField({
      name: 'body',
      type: 'text',
      rows: 8,
      description: 'The full policy in plain words. The app shows this text exactly as written.',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {select: {title: 'title', subtitle: 'summary'}},
})
