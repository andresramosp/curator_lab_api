import { BaseModel, beforeSave, column, computed } from '@adonisjs/lucid/orm'

export default class DescriptionChunk extends BaseModel {
  public static table = 'descriptions_chunks'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare photoId: number

  @column()
  declare category: string

  @column()
  declare area: 'left' | 'right' | 'middle'

  @column()
  declare chunk: string

  @column({ serializeAs: null })
  declare embedding: string

  public getParsedEmbedding(): number[] | null {
    return this.embedding ? JSON.parse(this.embedding) : null
  }

  // Hook para formatear embedding antes de guardar
  @beforeSave()
  public static formatEmbedding(desc: DescriptionChunk) {
    if (desc.embedding && Array.isArray(desc.embedding)) {
      // Convierte el array en formato pgvector: '[value1,value2,...]'
      desc.embedding = `[${(desc.embedding as any[]).join(',')}]`
    }
  }
}
