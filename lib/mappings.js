const mappings = {
  filename: 'file:name',
  uuid: 'file:id/file', // uuid
  directory: 'file:id/dir', // uuid
  atime: 'file:date/accessed',
  mtime: 'file:date/modified',
  ctime: 'file:date/changed', // status
  birthtime: 'file:date/created',

  TALB: 'frame:title/album',
  TIT2: 'frame:title/track',
  TPE1: 'frame:artist/track',
  TPE2: 'frame:artist/album',
  TPE3: 'frame:conductor',
  TPUB: 'frame:publisher',
  TRCK: 'frame:index/track', // number/total
  TPOS: 'frame:index/disc', // number/total
  TYER: 'frame:date/year', // generic
  TORY: 'frame:date/release', // ID3v2.3.0
  TDOR: 'frame:date/release', // ID3v2.4.0
  TDRC: 'frame:date/recording',
  TCON: 'frame:mood/genre',
  TMED: 'frame:source/media',
  TSO2: 'frame:sort/album',
  TSOP: 'frame:sort/artist', // 'The Police' => 'Police'
  USLT: 'frame:lyrics',

  TSRC: 'frame:id/isrc',
  'TXXX/BARCODE': 'frame:id/barcode',
  'TXXX/CATALOGNUMBER': 'frame:id/catalog',

  'TXXX/Acoustid Id':          'acoustid.org:id', // uuid,
  'TXXX/Acoustid Fingerprint': 'acoustid.org:fingerprint', // base-64
  'TXXX/Acoustid Duration':    'acoustid.org:duration', // number [seconds]

  'TXXX/MusicBrainz Artist Id':        'musicbrainz.org:id/artist/track', // uuid
  'TXXX/MusicBrainz Album Artist Id':  'musicbrainz.org:id/artist/album', // uuid
  'TXXX/MusicBrainz Album Id':         'musicbrainz.org:id/album', // uuid
  'TXXX/MusicBrainz Release Group Id': 'musicbrainz.org:id/release/group', // uuid
  'TXXX/MusicBrainz Release Track Id': 'musicbrainz.org:id/release/track', // uuid
  'TXXX/MusicBrainz Album Type':       'musicbrainz.org:album/type',
  'TXXX/MusicBrainz Album Status':     'musicbrainz.org:album/status',

  'TXXX/ALBUMARTISTSORT':              'frame:sort/artist',

  'APIC/0':                            'frame:picture/cover', // other => cover
  'APIC/3':                            'frame:picture/cover'
}

export const translate = o =>
  Object.entries(o).reduce((acc, [key, value]) => {
    if (key === 'id/tag') return acc // don't report
    else if (key === 'size') return acc

    if (mappings[key]) acc[mappings[key]] = value
    else console.warn('dropping frame', key, value)
    return acc
  }, {})
