import {DocumentsIcon} from '@sanity/icons/Documents'
import {defineArrayMember, defineField, defineType} from 'sanity'

// Public legal pages (prompts/24), shown at /<slug> in the app and on the website,
// e.g. the Terms of Service at /terms. Kept apart from `policy` so they never feed the
// Ask answers or the policies Knowledge Base.
export const legalPage = defineType({
  name: 'legalPage',
  title: 'Legal page',
  type: 'document',
  icon: DocumentsIcon,
  fields: [
    defineField({name: 'title', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      description: 'The page address: "terms" shows at /terms.',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'updated', title: 'Last updated', type: 'date', validation: (rule) => rule.required()}),
    defineField({name: 'intro', type: 'text', rows: 3, validation: (rule) => rule.required()}),
    defineField({
      name: 'sections',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'section',
          fields: [
            defineField({name: 'heading', type: 'string', validation: (rule) => rule.required()}),
            defineField({
              name: 'paragraphs',
              type: 'array',
              of: [defineArrayMember({type: 'text', rows: 4})],
              validation: (rule) => rule.required().min(1),
            }),
          ],
          preview: {select: {title: 'heading'}},
        }),
      ],
    }),
  ],
  preview: {select: {title: 'title', subtitle: 'slug.current'}},
})
