// Rewrites each stay's summary and description with Agent Actions, using only that stay's facts,
// checks the result in code and with Agent Actions Prompt, and publishes it only if nothing is
// unsupported. Run from studio/:
//   node --env-file=../.env.local scripts/write-stay-copy.ts [--slug <slug>] [--dry-run]

import {createClient} from '@sanity/client'

const SCHEMA_ID = '_.schemas.default'
const SUMMARY_MAX = 120

const projectId = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.EXPO_PUBLIC_SANITY_DATASET
const token = process.env.SANITY_WRITE_TOKEN
if (!projectId || !dataset || !token) {
  console.error(
    'Missing EXPO_PUBLIC_SANITY_PROJECT_ID, EXPO_PUBLIC_SANITY_DATASET or SANITY_WRITE_TOKEN. Run with --env-file=../.env.local.',
  )
  process.exit(1)
}

const client = createClient({projectId, dataset, token, apiVersion: 'vX', useCdn: false})

const args = process.argv.slice(2)
const onlySlug = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : undefined
const dryRun = args.includes('--dry-run')

// Everything the copy may draw on. The current summary and description are never included.
const FACTS = `{
  title, propertyType, category, place, maxGuests, bedrooms, beds, bathrooms, petsAllowed,
  amenities, houseRules, checkInTime, checkOutTime, highlights, "photos": images[].alt
}`

type Facts = {
  title: string
  petsAllowed?: boolean
  amenities?: string[]
  highlights?: string[]
  photos?: string[]
}
type Stay = {_id: string; slug: string; facts: Facts}
type Copy = {summary?: string; description?: string}

const INSTRUCTION = `
You write the listing copy for a holiday rental called "$title".
Use only these facts about the stay, and nothing else you know or imagine: $facts

Write two fields:
- summary: one sentence, at most ${SUMMARY_MAX} characters, for a listing card. No price.
- description: two to four sentences, written for a guest, on how the stay feels and what is around it.

Rules:
- Every claim must come from the facts. Don't invent places, distances, views, sounds, people, activities or amenities.
- Don't use any number that isn't in the facts. Never mention price, rating or reviews.
- Mention pets only as petsAllowed says.
- Plain, warm words. No exclamation marks, no superlatives like "best" or "perfect".
$avoid`

const CHECK = `
Here are the facts about a holiday rental: $facts
Here is its listing copy: $copy
List every claim in the copy that the facts don't support. A claim is supported if a fact states it
or plainly implies it (a "hot tub" amenity supports "soak in the hot tub"; "Very quiet" supports "peaceful").
Feelings about supported facts are fine. Places, distances, views, sounds, activities, amenities and
numbers that no fact mentions are not.
Respond in JSON as {"unsupported": ["claim one", "claim two"]}, with an empty list if everything is supported.`

// Words that name an amenity. A match needs the amenity in `amenities`, or the same word in a
// highlight or photo, unless it is negated ("no Wi-Fi").
const AMENITY_WORDS: Record<string, RegExp> = {
  hotTub: /hot ?tub|jacuzzi/i,
  pool: /\bpool\b/i,
  wifi: /wi-?fi|internet/i,
  fireplace: /fireplace|wood stove/i,
  oceanView: /ocean views?|sea views?/i,
  forestViews: /forest views?/i,
  mountainViews: /mountain views?/i,
  kitchen: /kitchen/i,
  parking: /parking/i,
  airConditioning: /air[- ]conditioning/i,
  washer: /washer|laundry/i,
  workspace: /workspace|desk|home office/i,
  evCharger: /\bEV\b|electric vehicle/i,
  beachAccess: /beach access|private beach/i,
}

const negated = (text: string, index: number) => /\b(no|without|not)\s+(\w+\s+)?$/i.test(text.slice(Math.max(0, index - 20), index))

export function codeCheck(copy: Copy, facts: Facts): string[] {
  const problems: string[] = []
  const summary = copy.summary ?? ''
  const description = copy.description ?? ''
  const text = `${summary} ${description}`
  const factText = JSON.stringify(facts)
  const sourceText = [...(facts.highlights ?? []), ...(facts.photos ?? [])].join(' ')

  if (!summary) problems.push('summary is empty')
  if (!description) problems.push('description is empty')
  if (summary.length > SUMMARY_MAX) problems.push(`summary is ${summary.length} characters`)
  if (/[£$]/.test(text)) problems.push('mentions a price')

  for (const number of text.match(/\d+(\.\d+)?/g) ?? []) {
    if (!new RegExp(`(^|[^\\d.])${number.replace('.', '\\.')}([^\\d.]|$)`).test(factText)) {
      problems.push(`number ${number} is not in the facts`)
    }
  }

  for (const [amenity, pattern] of Object.entries(AMENITY_WORDS)) {
    if (facts.amenities?.includes(amenity) || pattern.test(sourceText)) continue
    const global = new RegExp(pattern.source, 'gi')
    for (const match of text.matchAll(global)) {
      if (!negated(text, match.index ?? 0)) problems.push(`"${match[0]}" but no ${amenity} amenity`)
    }
  }

  if (!facts.petsAllowed) {
    for (const match of text.matchAll(/\b(pets?|dogs?|pet friendly)\b/gi)) {
      if (!negated(text, match.index ?? 0)) problems.push(`mentions "${match[0]}" but pets aren't allowed`)
    }
  }
  return problems
}

async function promptCheck(copy: Copy, facts: Facts): Promise<string[]> {
  // The client types a JSON prompt's result as string, so it is cast to the shape asked for.
  const result = (await client.agent.action.prompt({
    instruction: CHECK,
    instructionParams: {
      facts: {type: 'constant', value: JSON.stringify(facts)},
      copy: {type: 'constant', value: JSON.stringify(copy)},
    },
    format: 'json',
    temperature: 0,
  })) as unknown as {unsupported?: string[]}
  return (result.unsupported ?? []).map((claim) => `unsupported: ${claim}`)
}

export async function checkCopy(copy: Copy, facts: Facts): Promise<string[]> {
  const problems = codeCheck(copy, facts)
  // The prompt check costs a request, so it only runs on copy that passes the code check.
  return problems.length > 0 ? problems : promptCheck(copy, facts)
}

async function generate(stay: Stay, avoid: string[]): Promise<Copy> {
  const draftId = `drafts.${stay._id}`
  // Start the draft from the published stay without its old copy, so no old wording can leak in.
  const published = await client.getDocument(stay._id)
  if (!published) throw new Error(`stay ${stay.slug} is not published`)
  const draft: Record<string, unknown> = {...published, _id: draftId}
  for (const key of ['_rev', '_createdAt', '_updatedAt', 'summary', 'description']) delete draft[key]
  await client.createOrReplace({...draft, _id: draftId, _type: 'property'})

  const result = await client.agent.action.generate({
    schemaId: SCHEMA_ID,
    documentId: draftId,
    instruction: INSTRUCTION,
    instructionParams: {
      title: {type: 'constant', value: stay.facts.title},
      facts: {type: 'constant', value: JSON.stringify(stay.facts)},
      avoid: {
        type: 'constant',
        value:
          avoid.length > 0
            ? `- An earlier attempt was rejected for: ${avoid.join('; ')}. Don't repeat these.`
            : '- This is the first attempt.',
      },
    },
    target: {include: ['summary', 'description'], operation: 'set'},
  })
  return {summary: result.summary as string | undefined, description: result.description as string | undefined}
}

async function writeStay(stay: Stay) {
  let problems: string[] = []
  let copy: Copy = {}
  for (let attempt = 0; attempt < 2; attempt++) {
    copy = await generate(stay, problems)
    problems = await checkCopy(copy, stay.facts)
    if (problems.length === 0) break
  }

  if (problems.length > 0) {
    console.log(`${stay.slug}: draft (failed: ${problems.join('; ')})`)
  } else if (dryRun) {
    console.log(`${stay.slug}: dry run ok`)
  } else {
    await client.action({
      actionType: 'sanity.action.document.publish',
      draftId: `drafts.${stay._id}`,
      publishedId: stay._id,
    })
    console.log(`${stay.slug}: published`)
  }
  console.log(`  summary: ${copy.summary}\n  description: ${copy.description}`)
}

async function main() {
  const stays = await client.fetch<Stay[]>(
    `*[_type == "property" && !(_id in path("drafts.**")) && (!defined($slug) || slug.current == $slug)]
      | order(title asc) {_id, "slug": slug.current, "facts": ${FACTS}}`,
    {slug: onlySlug ?? null},
  )
  if (stays.length === 0) {
    console.error(onlySlug ? `No stay with slug ${onlySlug}.` : 'No stays found.')
    process.exit(1)
  }
  // One at a time, to stay inside Agent Actions rate limits.
  for (const stay of stays) {
    try {
      await writeStay(stay)
    } catch (error) {
      console.log(`${stay.slug}: error (${error instanceof Error ? error.message : String(error)})`)
    }
  }
}

if (process.argv[1]?.endsWith('write-stay-copy.ts')) await main()
