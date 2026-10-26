import {HomeIcon} from '@sanity/icons/Home'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {amenities, categories, propertyTypes} from '../shared/options'

export const property = defineType({
  name: 'property',
  title: 'Stay',
  type: 'document',
  icon: HomeIcon,
  groups: [
    {name: 'listing', title: 'Listing', default: true},
    {name: 'details', title: 'Details'},
    {name: 'stay', title: 'Rules and host'},
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      group: 'listing',
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'listing',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'propertyType',
      type: 'string',
      group: 'listing',
      options: {list: propertyTypes, layout: 'dropdown'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      type: 'string',
      group: 'listing',
      description: 'The home screen chip this stay appears under.',
      options: {list: categories, layout: 'radio', direction: 'horizontal'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'place',
      type: 'object',
      group: 'listing',
      fields: [
        defineField({name: 'city', type: 'string', validation: (rule) => rule.required()}),
        defineField({
          name: 'region',
          type: 'string',
          description: 'State or region code as guests write it, e.g. "CA".',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'country',
          type: 'string',
          initialValue: 'United States',
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'location', type: 'geopoint', group: 'listing'}),
    defineField({
      name: 'images',
      type: 'array',
      group: 'listing',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'alt',
              title: 'Alternative text',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
          ],
        }),
      ],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'summary',
      type: 'string',
      group: 'listing',
      description: 'One sentence for cards.',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 5,
      group: 'listing',
      description:
        'Two to four sentences on how the stay feels (quiet, cozy, views). AI search ranks stays against this text. Written by scripts/write-stay-copy.ts from this stay\'s facts.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'highlights',
      type: 'array',
      group: 'listing',
      description:
        "Short facts about the stay's surroundings and feel, in the host's words. Generated copy may only use these and the other fields.",
      of: [defineArrayMember({type: 'string', validation: (rule) => rule.max(80)})],
      validation: (rule) => rule.max(8),
    }),
    defineField({
      name: 'pricePerNight',
      title: 'Price per night (GBP)',
      description: 'Whole pounds. The app shows it as £.',
      type: 'number',
      group: 'details',
      validation: (rule) => rule.required().integer().positive(),
    }),
    defineField({
      name: 'maxGuests',
      type: 'number',
      group: 'details',
      validation: (rule) => rule.required().integer().min(1),
    }),
    defineField({
      name: 'bedrooms',
      type: 'number',
      group: 'details',
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: 'beds',
      type: 'number',
      group: 'details',
      validation: (rule) => rule.required().integer().min(1),
    }),
    defineField({
      name: 'bathrooms',
      type: 'number',
      group: 'details',
      validation: (rule) => rule.required().min(0.5),
    }),
    defineField({
      name: 'petsAllowed',
      title: 'Pet friendly',
      type: 'boolean',
      group: 'details',
      initialValue: false,
    }),
    defineField({
      name: 'amenities',
      type: 'array',
      group: 'details',
      of: [defineArrayMember({type: 'string'})],
      options: {list: amenities, layout: 'grid'},
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'rating',
      type: 'number',
      group: 'details',
      validation: (rule) => rule.min(0).max(5).precision(1),
    }),
    defineField({
      name: 'reviewCount',
      type: 'number',
      group: 'details',
      validation: (rule) => rule.integer().min(0),
    }),
    defineField({
      name: 'houseRules',
      type: 'array',
      group: 'stay',
      of: [defineArrayMember({type: 'string'})],
    }),
    defineField({name: 'checkInTime', type: 'string', group: 'stay', description: 'e.g. "4:00 PM"'}),
    defineField({name: 'checkOutTime', type: 'string', group: 'stay', description: 'e.g. "11:00 AM"'}),
    defineField({
      name: 'host',
      type: 'reference',
      group: 'stay',
      to: [{type: 'host'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'cancellationPolicy',
      type: 'reference',
      group: 'stay',
      to: [{type: 'policy'}],
      options: {filter: 'topic == "cancellation"'},
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      city: 'place.city',
      region: 'place.region',
      price: 'pricePerNight',
      media: 'images.0',
    },
    prepare: ({title, city, region, price, media}) => ({
      title,
      subtitle: [city && region ? `${city}, ${region}` : city, price ? `$${price}/night` : null]
        .filter(Boolean)
        .join(' · '),
      media,
    }),
  },
})
