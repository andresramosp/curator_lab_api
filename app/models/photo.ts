import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, computed, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Tag from './tag.js'
import DescriptionChunk from './descriptionChunk.js'
import AnalyzerProcess from './analyzer/analyzerProcess.js'

export type DescriptionType = 'context' | 'story' | 'topology' | 'artistic'
export type PhotoDescriptions = Record<DescriptionType, string>

export default class Photo extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare descriptions: PhotoDescriptions | null

  @column()
  declare title: string | null

  @column()
  declare model: string | null

  @column()
  declare name: string

  @column()
  declare url: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @manyToMany(() => Tag, {
    pivotTable: 'tags_photos',
    localKey: 'id',
    pivotForeignKey: 'photo_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'tag_id',
    pivotColumns: ['category', 'area'],
  })
  declare tags: ManyToMany<typeof Tag>

  @hasMany(() => DescriptionChunk, {
    foreignKey: 'photoId',
  })
  declare descriptionChunks: HasMany<typeof DescriptionChunk>

  @column()
  declare analyzerProcessId: string // Clave foránea que conecta con AnalyzerProcess

  @belongsTo(() => AnalyzerProcess)
  declare analyzerProcess: BelongsTo<typeof AnalyzerProcess>

  @computed()
  public get needProcess(): boolean {
    return this.analyzerProcess?.currentStage !== 'finished'
  }
}
