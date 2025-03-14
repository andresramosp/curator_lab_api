import type { HttpContext } from '@adonisjs/core/http'
import Tag from '#models/tag'

export default class TagsController {
  public async list({ request, response }: HttpContext) {
    const result = await Tag.all()
    return response.ok({ result })
  }

  // TODO: por usuario!
  public async search({ request, response }: HttpContext) {
    const term = request.input('term', '').toLowerCase()
    const result = await Tag.query()
      .whereRaw('LOWER(name) LIKE ?', [`%${term}%`])
      .orderByRaw('LENGTH(name) ASC')

    return response.ok({ result })
  }
}
