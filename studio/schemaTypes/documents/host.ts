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
    defineField({
      name: 'clerkOrgId',
      title: 'Hosting account (dev)',
      type: 'string',
      readOnly: true,
      description: 'Clerk development organization for this host company. Set by scripts/invite-host.mjs; not edited here.',
    }),
    defineField({
      name: 'clerkOrgIdLive',
      title: 'Hosting account (production)',
      type: 'string',
      readOnly: true,
      description: 'Clerk production organization. Set by scripts/invite-host.mjs --production; not edited here.',
    }),
  ],
  preview: {
    select: {title: 'name', superhost: 'superhost'},
    prepare: ({title, superhost}) => ({title, subtitle: superhost ? 'Superhost' : 'Host'}),
  },
})
