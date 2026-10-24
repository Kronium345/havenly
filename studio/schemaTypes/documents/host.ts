import {UserIcon} from '@sanity/icons/User'
import {defineField, defineType} from 'sanity'

export const host = defineType({
  name: 'host',
  title: 'Host',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({name: 'name', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'superhost',
      type: 'boolean',
      initialValue: false,
      description: 'Shown as a Superhost badge on stays.',
    }),
    defineField({
      name: 'joinedYear',
      title: 'Hosting since',
      type: 'number',
      validation: (rule) => rule.integer().min(2000).max(2100),
    }),
    defineField({name: 'bio', type: 'text', rows: 3}),
  ],
  preview: {
    select: {title: 'name', superhost: 'superhost'},
    prepare: ({title, superhost}) => ({title, subtitle: superhost ? 'Superhost' : 'Host'}),
  },
})
