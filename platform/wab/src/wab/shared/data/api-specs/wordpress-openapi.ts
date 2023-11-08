export const WordpressOpenapiRaw = `
swagger: '2.0'
info:
  version: 0.1.0
  title: Wordpress v2 API
  description: Wordpress v2 API
basePath: /wp-json/wp/v2
produces:
  - application/json
consumes:
  - application/x-www-form-urlencoded
schemes:
  - http
  - https
securityDefinitions:
  oauth:
    type: oauth2
    x-oauth1: true
    flow: accessCode
    authorizationUrl: /oauth1/authorize
    tokenUrl: /oauth1/request
    x-accessUrl: /oauth1/access
    scopes:
      basic: >-
        OAuth authentication uses the OAuth 1.0a specification (published as
        RFC5849) and requires installing the OAuth plugin on the site.
paths:
  /posts:
    get:
      summary: List Posts
      description: >-
        Scope under which the request is made; determines fields present in
        response.
      externalDocs:
        description: More information here
        url: 'http://v2.wp-api.org/reference/posts/'
      parameters:
        - $ref: '#/parameters/context'
        - $ref: '#/parameters/page'
        - $ref: '#/parameters/per_page'
        - $ref: '#/parameters/search'
        - $ref: '#/parameters/after'
        - $ref: '#/parameters/author'
        - $ref: '#/parameters/author_exclude'
        - $ref: '#/parameters/before'
        - $ref: '#/parameters/exclude'
        - $ref: '#/parameters/include'
        - $ref: '#/parameters/offset'
        - $ref: '#/parameters/order'
        - $ref: '#/parameters/orderby'
        - $ref: '#/parameters/slug'
        - $ref: '#/parameters/status'
        - $ref: '#/parameters/filter'
        - $ref: '#/parameters/categories'
        - $ref: '#/parameters/tags'
      responses:
        '200':
          description: Posts Listed.
          schema:
            type: array
            items:
              $ref: '#/definitions/post'
    post:
      summary: Create Post
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/date'
        - $ref: '#/parameters/date_gmt'
        - $ref: '#/parameters/password'
        - $ref: '#/parameters/slug'
        - $ref: '#/parameters/status'
        - $ref: '#/parameters/title'
        - $ref: '#/parameters/content'
        - $ref: '#/parameters/author'
        - $ref: '#/parameters/excerpt'
        - $ref: '#/parameters/featured_media'
        - $ref: '#/parameters/comment_status'
        - $ref: '#/parameters/ping_status'
        - $ref: '#/parameters/sticky'
        - $ref: '#/parameters/categories'
        - $ref: '#/parameters/tags'
      responses:
        '200':
          description: Post created.
          schema:
            $ref: '#/definitions/post'
  '/posts/{id}':
    get:
      summary: Get Single Post
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/context'
      responses:
        '200':
          description: Post retrieved.
          schema:
            $ref: '#/definitions/post'
    post:
      summary: Update Single Post
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/context'
        - $ref: '#/parameters/page'
        - $ref: '#/parameters/per_page'
        - $ref: '#/parameters/search'
        - $ref: '#/parameters/after'
        - $ref: '#/parameters/author'
        - $ref: '#/parameters/author_exclude'
        - $ref: '#/parameters/before'
        - $ref: '#/parameters/exclude'
        - $ref: '#/parameters/include'
        - $ref: '#/parameters/offset'
        - $ref: '#/parameters/order'
        - $ref: '#/parameters/orderby'
        - $ref: '#/parameters/slug'
        - $ref: '#/parameters/status'
        - $ref: '#/parameters/filter'
        - $ref: '#/parameters/categories'
        - $ref: '#/parameters/tags'
      responses:
        '200':
          description: Post updated.
          schema:
            $ref: '#/definitions/post'
    delete:
      summary: Delete Single Post
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/force'
      responses:
        '200':
          description: Post deleted.
  '/posts/{id}/revisions':
    get:
      summary: Get post revisions
      externalDocs:
        description: More information here
        url: 'http://v2.wp-api.org/reference/posts/revisions.html'
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/context'
      responses:
        '200':
          description: Revisions Listed.
          schema:
            type: array
            items:
              $ref: '#/definitions/revision'
  '/posts/{id}/revisions/{revisionid}':
    get:
      summary: Get single post revisions
      externalDocs:
        description: More information here
        url: 'http://v2.wp-api.org/reference/posts/revisions.html'
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/revisionid'
        - $ref: '#/parameters/context'
      responses:
        '200':
          description: Revision retrieved.
          schema:
            $ref: '#/definitions/revision'
    delete:
      summary: Delete single post revisions
      externalDocs:
        description: More information here
        url: 'http://v2.wp-api.org/reference/posts/revisions.html'
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/revisionid'
      responses:
        '200':
          description: Revision retrieved.
  /pages:
    get:
      summary: List Pages
      description: >-
        Scope under which the request is made; determines fields present in
        response.
      externalDocs:
        description: More information here
        url: 'http://v2.wp-api.org/reference/pages/'
      parameters:
        - $ref: '#/parameters/context'
        - $ref: '#/parameters/page'
        - $ref: '#/parameters/per_page'
        - $ref: '#/parameters/search'
        - $ref: '#/parameters/after'
        - $ref: '#/parameters/author'
        - $ref: '#/parameters/author_exclude'
        - $ref: '#/parameters/before'
        - $ref: '#/parameters/exclude'
        - $ref: '#/parameters/include'
        - $ref: '#/parameters/menu_order'
        - $ref: '#/parameters/offset'
        - $ref: '#/parameters/order'
        - $ref: '#/parameters/orderby'
        - $ref: '#/parameters/parent'
        - $ref: '#/parameters/parent_exclude'
        - $ref: '#/parameters/slug'
        - $ref: '#/parameters/status'
        - $ref: '#/parameters/filter'
      responses:
        '200':
          description: Pages Listed.
          schema:
            type: array
            items:
              $ref: '#/definitions/page'
    post:
      summary: Create Page
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/date'
        - $ref: '#/parameters/date_gmt'
        - $ref: '#/parameters/password'
        - $ref: '#/parameters/slug'
        - $ref: '#/parameters/status'
        - $ref: '#/parameters/parent'
        - $ref: '#/parameters/title'
        - $ref: '#/parameters/content'
        - $ref: '#/parameters/author'
        - $ref: '#/parameters/excerpt'
        - $ref: '#/parameters/featured_media'
        - $ref: '#/parameters/comment_status'
        - $ref: '#/parameters/ping_status'
        - $ref: '#/parameters/menu_order'
        - $ref: '#/parameters/template'
      responses:
        '200':
          description: Page created.
          schema:
            $ref: '#/definitions/page'
  '/pages/{id}':
    get:
      summary: Get Single Page
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/context'
      responses:
        '200':
          description: Page retrieved.
          schema:
            $ref: '#/definitions/page'
    post:
      summary: Update Single Page
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/date'
        - $ref: '#/parameters/date_gmt'
        - $ref: '#/parameters/password'
        - $ref: '#/parameters/slug'
        - $ref: '#/parameters/status'
        - $ref: '#/parameters/parent'
        - $ref: '#/parameters/title'
        - $ref: '#/parameters/content'
        - $ref: '#/parameters/author'
        - $ref: '#/parameters/excerpt'
        - $ref: '#/parameters/featured_media'
        - $ref: '#/parameters/comment_status'
        - $ref: '#/parameters/ping_status'
        - $ref: '#/parameters/menu_order'
        - $ref: '#/parameters/template'
      responses:
        '200':
          description: Page updated.
          schema:
            $ref: '#/definitions/page'
    delete:
      summary: Delete Single Page
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/force'
      responses:
        '200':
          description: Post deleted.
  /media:
    get:
      summary: List Media
      description: >-
        Scope under which the request is made; determines fields present in
        response.
      externalDocs:
        description: More information here
        url: 'http://v2.wp-api.org/reference/media/'
      parameters:
        - $ref: '#/parameters/context'
        - $ref: '#/parameters/page'
        - $ref: '#/parameters/per_page'
        - $ref: '#/parameters/search'
        - $ref: '#/parameters/after'
        - $ref: '#/parameters/author'
        - $ref: '#/parameters/author_exclude'
        - $ref: '#/parameters/before'
        - $ref: '#/parameters/exclude'
        - $ref: '#/parameters/include'
        - $ref: '#/parameters/offset'
        - $ref: '#/parameters/order'
        - $ref: '#/parameters/orderby'
        - $ref: '#/parameters/parent'
        - $ref: '#/parameters/parent_exclude'
        - $ref: '#/parameters/slug'
        - $ref: '#/parameters/status'
        - $ref: '#/parameters/filter'
        - $ref: '#/parameters/media_type'
        - $ref: '#/parameters/mime_type'
      responses:
        '200':
          description: Media Listed.
          schema:
            type: array
            items:
              $ref: '#/definitions/media'
    post:
      summary: Create Media
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/date'
        - $ref: '#/parameters/date_gmt'
        - $ref: '#/parameters/password'
        - $ref: '#/parameters/slug'
        - $ref: '#/parameters/status'
        - $ref: '#/parameters/title'
        - $ref: '#/parameters/author'
        - $ref: '#/parameters/comment_status'
        - $ref: '#/parameters/ping_status'
        - $ref: '#/parameters/alt_text'
        - $ref: '#/parameters/caption'
        - $ref: '#/parameters/description'
        - $ref: '#/parameters/post'
      responses:
        '200':
          description: Media created.
          schema:
            $ref: '#/definitions/media'
  '/media/{id}':
    get:
      summary: Get Single Media
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/context'
      responses:
        '200':
          description: Page retrieved.
          schema:
            $ref: '#/definitions/media'
    post:
      summary: Update Single Media
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/date'
        - $ref: '#/parameters/date_gmt'
        - $ref: '#/parameters/password'
        - $ref: '#/parameters/slug'
        - $ref: '#/parameters/status'
        - $ref: '#/parameters/title'
        - $ref: '#/parameters/author'
        - $ref: '#/parameters/comment_status'
        - $ref: '#/parameters/ping_status'
        - $ref: '#/parameters/alt_text'
        - $ref: '#/parameters/caption'
        - $ref: '#/parameters/description'
        - $ref: '#/parameters/post'
      responses:
        '200':
          description: Page updated.
          schema:
            $ref: '#/definitions/media'
    delete:
      summary: Delete Single Media
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/force'
      responses:
        '200':
          description: Media deleted.
  /types:
    get:
      summary: List Type
      description: >-
        Scope under which the request is made; determines fields present in
        response.
      externalDocs:
        description: More information here
        url: 'http://v2.wp-api.org/reference/types/'
      parameters:
        - $ref: '#/parameters/context'
      responses:
        '200':
          description: Types Listed.
          schema:
            type: array
            items:
              $ref: '#/definitions/type'
  '/types/{id}':
    get:
      summary: Get Single Type
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/context'
      responses:
        '200':
          description: Type retrieved.
          schema:
            $ref: '#/definitions/type'
  /statuses:
    get:
      summary: List Status
      description: >-
        Scope under which the request is made; determines fields present in
        response.
      externalDocs:
        description: More information here
        url: 'http://v2.wp-api.org/reference/statuses/'
      parameters:
        - $ref: '#/parameters/context'
      responses:
        '200':
          description: Statuses Listed.
          schema:
            type: array
            items:
              $ref: '#/definitions/status'
  '/statuses/{id}':
    get:
      summary: Get Single Status
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/context'
      responses:
        '200':
          description: Status retrieved.
          schema:
            $ref: '#/definitions/status'
  /comments:
    get:
      summary: List Comments
      description: >-
        Scope under which the request is made; determines fields present in
        response.
      externalDocs:
        description: More information here
        url: 'http://v2.wp-api.org/reference/comments/'
      parameters:
        - $ref: '#/parameters/context'
        - $ref: '#/parameters/page'
        - $ref: '#/parameters/per_page'
        - $ref: '#/parameters/search'
        - $ref: '#/parameters/after'
        - $ref: '#/parameters/author'
        - $ref: '#/parameters/author_exclude'
        - $ref: '#/parameters/author_email'
        - $ref: '#/parameters/before'
        - $ref: '#/parameters/exclude'
        - $ref: '#/parameters/include'
        - $ref: '#/parameters/karma'
        - $ref: '#/parameters/offset'
        - $ref: '#/parameters/order'
        - $ref: '#/parameters/orderby'
        - $ref: '#/parameters/parent'
        - $ref: '#/parameters/parent_exclude'
        - $ref: '#/parameters/post'
        - $ref: '#/parameters/status'
        - $ref: '#/parameters/type'
      responses:
        '200':
          description: Comments Listed.
          schema:
            type: array
            items:
              $ref: '#/definitions/comment'
    post:
      summary: Create Comment
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/date'
        - $ref: '#/parameters/date_gmt'
        - $ref: '#/parameters/password'
        - $ref: '#/parameters/slug'
        - $ref: '#/parameters/status'
        - $ref: '#/parameters/title'
        - $ref: '#/parameters/author'
        - $ref: '#/parameters/comment_status'
        - $ref: '#/parameters/ping_status'
        - $ref: '#/parameters/alt_text'
        - $ref: '#/parameters/caption'
        - $ref: '#/parameters/description'
        - $ref: '#/parameters/post'
      responses:
        '200':
          description: Comment created.
          schema:
            $ref: '#/definitions/comment'
  '/comments/{id}':
    get:
      summary: Get Single Comment
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/context'
      responses:
        '200':
          description: Comment retrieved.
          schema:
            $ref: '#/definitions/comment'
    post:
      summary: Update Single Comment
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/date'
        - $ref: '#/parameters/date_gmt'
        - $ref: '#/parameters/password'
        - $ref: '#/parameters/slug'
        - $ref: '#/parameters/status'
        - $ref: '#/parameters/title'
        - $ref: '#/parameters/author'
        - $ref: '#/parameters/comment_status'
        - $ref: '#/parameters/ping_status'
        - $ref: '#/parameters/alt_text'
        - $ref: '#/parameters/caption'
        - $ref: '#/parameters/description'
        - $ref: '#/parameters/post'
      responses:
        '200':
          description: Page updated.
          schema:
            $ref: '#/definitions/comment'
    delete:
      summary: Delete Single Comment
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/force'
      responses:
        '200':
          description: Comment deleted.
  /taxonomies:
    get:
      summary: List Taxonomy
      externalDocs:
        description: More information here
        url: 'http://v2.wp-api.org/reference/taxonomies/'
      parameters:
        - $ref: '#/parameters/context'
        - $ref: '#/parameters/type'
      responses:
        '200':
          description: Types Listed.
          schema:
            type: array
            items:
              $ref: '#/definitions/taxonomy'
  '/taxonomies/{id}':
    get:
      summary: Get Single Taxonomy
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/context'
      responses:
        '200':
          description: Taxonomy retrieved.
          schema:
            $ref: '#/definitions/taxonomy'
  /categories:
    get:
      summary: List categories
      externalDocs:
        description: More information here
        url: 'http://v2.wp-api.org/reference/categories/'
      parameters:
        - $ref: '#/parameters/context'
        - $ref: '#/parameters/page'
        - $ref: '#/parameters/per_page'
        - $ref: '#/parameters/search'
        - $ref: '#/parameters/hide_empty'
        - $ref: '#/parameters/exclude'
        - $ref: '#/parameters/include'
        - $ref: '#/parameters/order'
        - $ref: '#/parameters/orderby'
        - $ref: '#/parameters/parent'
        - $ref: '#/parameters/post'
        - $ref: '#/parameters/slug'
      responses:
        '200':
          description: Category Listed.
          schema:
            type: array
            items:
              $ref: '#/definitions/category'
    post:
      summary: Create Category
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/description'
        - $ref: '#/parameters/name'
        - $ref: '#/parameters/slug'
        - $ref: '#/parameters/parent'
      responses:
        '200':
          description: Category created.
          schema:
            $ref: '#/definitions/category'
  '/categories/{id}':
    get:
      summary: Get Single Category
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/context'
      responses:
        '200':
          description: Category retrieved.
          schema:
            $ref: '#/definitions/category'
    post:
      summary: Update Single Category
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/description'
        - $ref: '#/parameters/name'
        - $ref: '#/parameters/slug'
        - $ref: '#/parameters/parent'
      responses:
        '200':
          description: Category updated.
          schema:
            $ref: '#/definitions/category'
    delete:
      summary: Delete Single Category
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/force'
      responses:
        '200':
          description: Category deleted.
  /tags:
    get:
      summary: List Tags
      externalDocs:
        description: More information here
        url: 'http://v2.wp-api.org/reference/tags/'
      parameters:
        - $ref: '#/parameters/context'
        - $ref: '#/parameters/page'
        - $ref: '#/parameters/per_page'
        - $ref: '#/parameters/search'
        - $ref: '#/parameters/exclude'
        - $ref: '#/parameters/include'
        - $ref: '#/parameters/order'
        - $ref: '#/parameters/orderby'
        - $ref: '#/parameters/post'
        - $ref: '#/parameters/slug'
      responses:
        '200':
          description: Tags Listed.
          schema:
            type: array
            items:
              $ref: '#/definitions/tag'
    post:
      summary: Create Tag
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/description'
        - $ref: '#/parameters/name'
        - $ref: '#/parameters/slug'
      responses:
        '200':
          description: Tag created.
          schema:
            $ref: '#/definitions/tag'
  '/tags/{id}':
    get:
      summary: Get Single Tag
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/context'
      responses:
        '200':
          description: Tag retrieved.
          schema:
            $ref: '#/definitions/tag'
    post:
      summary: Update Single Tag
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/description'
        - $ref: '#/parameters/name'
        - $ref: '#/parameters/slug'
      responses:
        '200':
          description: Tag updated.
          schema:
            $ref: '#/definitions/tag'
    delete:
      summary: Delete Single Tag
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/force'
      responses:
        '200':
          description: Tag deleted.
  /users:
    get:
      summary: List Tags
      externalDocs:
        description: More information here
        url: 'http://v2.wp-api.org/reference/users/'
      parameters:
        - $ref: '#/parameters/context'
        - $ref: '#/parameters/page'
        - $ref: '#/parameters/per_page'
        - $ref: '#/parameters/search'
        - $ref: '#/parameters/exclude'
        - $ref: '#/parameters/include'
        - $ref: '#/parameters/order'
        - $ref: '#/parameters/orderby'
        - $ref: '#/parameters/roles'
        - $ref: '#/parameters/slug'
      responses:
        '200':
          description: Users Listed.
          schema:
            type: array
            items:
              $ref: '#/definitions/user'
    post:
      summary: Create User
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/username'
        - $ref: '#/parameters/name'
        - $ref: '#/parameters/first_name'
        - $ref: '#/parameters/last_name'
        - $ref: '#/parameters/email'
        - $ref: '#/parameters/url'
        - $ref: '#/parameters/description'
        - $ref: '#/parameters/nickname'
        - $ref: '#/parameters/slug'
        - $ref: '#/parameters/roles'
        - $ref: '#/parameters/password'
        - $ref: '#/parameters/capabilities'
      responses:
        '200':
          description: User created.
          schema:
            $ref: '#/definitions/user'
  '/users/{id}':
    get:
      summary: Get Single User
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/context'
      responses:
        '200':
          description: User retrieved.
          schema:
            $ref: '#/definitions/user'
    post:
      summary: Update Single User
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/username'
        - $ref: '#/parameters/name'
        - $ref: '#/parameters/first_name'
        - $ref: '#/parameters/last_name'
        - $ref: '#/parameters/email'
        - $ref: '#/parameters/url'
        - $ref: '#/parameters/description'
        - $ref: '#/parameters/nickname'
        - $ref: '#/parameters/slug'
        - $ref: '#/parameters/roles'
        - $ref: '#/parameters/password'
        - $ref: '#/parameters/capabilities'
      responses:
        '200':
          description: User updated.
          schema:
            $ref: '#/definitions/user'
    delete:
      summary: Delete Single User
      security:
        - oauth:
            - basic
      parameters:
        - $ref: '#/parameters/id'
        - $ref: '#/parameters/force'
        - $ref: '#/parameters/reassign'
      responses:
        '200':
          description: User deleted.
definitions:
  user:
    properties:
      id:
        type: integer
        description: Unique identifier for the object.
      username:
        type: string
        description: Login name for the resource.
      name:
        type: string
        description: Display name for the resource.
      first_name:
        type: string
        description: First name for the resource.
      last_name:
        type: string
        description: Last name for the resource.
      email:
        type: string
        description: The email address for the resource.
      url:
        type: string
        description: URL of the resource.
      description:
        type: string
        description: Description of the resource.
      link:
        type: string
        description: Author URL to the resource.
      nickname:
        type: string
        description: The nickname for the resource.
      slug:
        type: string
        description: An alphanumeric identifier for the resource.
      registered_date:
        type: string
        description: Registration date for the resource.
      roles:
        type: array
        items:
          type: string
        description: Roles assigned to the resource.
      password:
        type: string
        description: Password for the resource (never included).
      capabilities:
        type: array
        items:
          type: string
        description: All capabilities assigned to the resource.
      extra_capabilities:
        type: array
        items:
          type: string
        description: Any extra capabilities assigned to the resource.
      avatar_urls:
        type: array
        items:
          type: string
        description: Avatar URLs for the resource.
  comment:
    properties:
      id:
        type: integer
        description: Unique identifier for the object.
      author:
        type: string
        description: The id for the author of the object.
      author_email:
        type: string
        description: Email address for the object author.
      author_ip:
        type: string
        description: IP address for the object author.
      author_name:
        type: string
        description: Display name for the object author.
      author_url:
        type: string
        description: URL for the object author.
      author_user_agent:
        type: string
        description: User agent for the object author.
      content:
        type: string
        description: The content for the object.
      date:
        type: string
        description: 'The date the object was published, in the site''s timezone.'
        format: date-time
      date_gmt:
        type: string
        description: 'The date the object was published, as GMT.'
        format: date-time
      karma:
        type: string
        description: Karma for the object
      link:
        type: string
        description: URL to the object.
      parent:
        type: integer
        description: The id for the parent of the object.
      post:
        type: string
        description: The id for the associated post of the resource.
      status:
        type: string
        enum:
          - publish
          - future
          - draft
          - pending
          - private
        description: A named status for the object.
      type:
        type: string
        description: Type of Post for the object.
      author_avatar_urls:
        type: string
        description: Avatar URLs for the object author.
  status:
    properties:
      private:
        type: boolean
        description: Whether posts with this resource should be private.
      protected:
        type: boolean
        description: Whether posts with this resource should be protected.
      public:
        type: boolean
        description: >-
          Whether posts of this resource should be shown in the front end of the
          site.
      queryable:
        type: boolean
        description: Whether posts with this resource should be publicly-queryable.
      show_in_list:
        type: boolean
        description: Whether to include posts in the edit listing for their post type.
      name:
        type: string
        description: The title for the resource.
      slug:
        type: string
        description: An alphanumeric identifier for the object unique to its type.
  taxonomy:
    allOf:
      - $ref: '#/definitions/type'
      - type: object
        properties:
          show_cloud:
            type: boolean
            description: Whether or not the term cloud should be displayed.
          types:
            type: array
            description: Types associated with resource.
            items:
              type: string
  category:
    allOf:
      - $ref: '#/definitions/tag'
      - type: object
        properties:
          parent:
            type: integer
            description: The id for the parent of the object.
  tag:
    properties:
      id:
        type: integer
        description: Unique identifier for the object.
      count:
        type: integer
        description: Number of published posts for the resource.
      description:
        type: string
        description: The description for the resource.
      link:
        type: string
        description: URL to the object.
      name:
        type: string
        description: The title for the resource.
      slug:
        type: string
        description: An alphanumeric identifier for the object unique to its type.
      taxonomy:
        type: string
        enum:
          - category
          - post_tag
          - nav_menu
          - link_category
          - post_format
        description: Type attribution for the resource.
  type:
    properties:
      capabilities:
        type: array
        description: All capabilities used by the resource.
        items:
          type: string
      description:
        type: string
        description: A human-readable description of the resource.
      hierarchical:
        type: string
        description: Whether or not the resource should have children.
      labels:
        type: string
        description: Human-readable labels for the resource for various contexts.
      name:
        type: string
        description: The title for the resource.
      slug:
        type: string
        description: An alphanumeric identifier for the object unique to its type.
  media:
    properties:
      date:
        type: string
        description: 'The date the object was published, in the site''s timezone.'
        format: date-time
      date_gmt:
        type: string
        description: 'The date the object was published, as GMT.'
        format: date-time
      guid:
        type: string
        description: The globally unique identifier for the object.
      id:
        type: integer
        description: Unique identifier for the object.
      modified:
        type: string
        description: 'The date the object was last modified, in the site''s timezone.'
        format: date-time
      modified_gmt:
        type: string
        description: 'The date the object was last modified, as GMT.'
        format: date-time
      password:
        type: string
        description: The A password to protect access to the post.
      slug:
        type: string
        description: An alphanumeric identifier for the object unique to its type.
      status:
        type: string
        enum:
          - publish
          - future
          - draft
          - pending
          - private
        description: A named status for the object.
      type:
        type: string
        description: Type of Post for the object.
      title:
        type: string
        description: The title for the object.
      author:
        type: string
        description: The id for the author of the object.
      comment_status:
        type: string
        enum:
          - open
          - closed
        description: Whether or not comments are open on the object
      ping_status:
        type: string
        enum:
          - open
          - closed
        description: Whether or not the object can be pinged.
      alt_text:
        type: string
        description: Alternative text to display when resource is not displayed
      caption:
        type: string
        description: The caption for the resource.
      description:
        type: string
        description: The description for the resource.
      media_type:
        type: string
        enum:
          - image
          - file
        description: Type of resource.
      mime_type:
        type: string
        description: Mime type of resource.
      media_details:
        type: string
        description: 'Details about the resource file, specific to its type.'
      post:
        type: string
        description: The id for the associated post of the resource.
      source_url:
        type: string
        description: URL to the original resource file.
  revision:
    properties:
      date:
        type: string
        description: 'The date the object was published, in the site''s timezone.'
        format: date-time
      date_gmt:
        type: string
        description: 'The date the object was published, as GMT.'
        format: date-time
      guid:
        type: string
        description: The globally unique identifier for the object.
      id:
        type: integer
        description: Unique identifier for the object.
      modified:
        type: string
        description: 'The date the object was last modified, in the site''s timezone.'
        format: date-time
      modified_gmt:
        type: string
        description: 'The date the object was last modified, as GMT.'
        format: date-time
      slug:
        type: string
        description: An alphanumeric identifier for the object unique to its type.
      title:
        type: string
        description: The title for the object.
      content:
        type: string
        description: The content for the object.
      author:
        type: string
        description: The id for the author of the object.
      excerpt:
        type: string
        description: The excerpt for the object
      parent:
        type: integer
        description: The id for the parent of the object.
  commonPostPage:
    properties:
      date:
        type: string
        description: 'The date the object was published, in the site''s timezone.'
        format: date-time
      date_gmt:
        type: string
        description: 'The date the object was published, as GMT.'
        format: date-time
      guid:
        type: string
        description: The globally unique identifier for the object.
      id:
        type: integer
        description: Unique identifier for the object.
      link:
        type: string
        description: URL to the object.
      modified:
        type: string
        description: 'The date the object was last modified, in the site''s timezone.'
        format: date-time
      modified_gmt:
        type: string
        description: 'The date the object was last modified, as GMT.'
        format: date-time
      password:
        type: string
        description: The A password to protect access to the post.
      slug:
        type: string
        description: An alphanumeric identifier for the object unique to its type.
      status:
        type: string
        enum:
          - publish
          - future
          - draft
          - pending
          - private
        description: A named status for the object.
      type:
        type: string
        description: Type of Post for the object.
      title:
        type: string
        description: The title for the object.
      content:
        type: string
        description: The content for the object.
      author:
        type: string
        description: The id for the author of the object.
      excerpt:
        type: string
        description: The excerpt for the object
      featured_media:
        type: string
        description: The id of the featured media for the object.
      comment_status:
        type: string
        enum:
          - open
          - closed
        description: Whether or not comments are open on the object
      ping_status:
        type: string
        enum:
          - open
          - closed
        description: Whether or not the object can be pinged.
  post:
    allOf:
      - $ref: '#/definitions/commonPostPage'
      - type: object
        properties:
          format:
            type: string
            enum:
              - standard
              - aside
              - chat
              - gallery
              - link
              - image
              - quote
              - status
              - video
              - audio
            description: The format for the object.
          sticky:
            type: boolean
            description: Whether or not the object should be treated as sticky.
          categories:
            type: array
            items:
              type: string
            description: The terms assigned to the object in the category taxonomy.
          tags:
            type: array
            description: he terms assigned to the object in the post_tag taxonomy.
            items:
              type: string
  page:
    allOf:
      - $ref: '#/definitions/commonPostPage'
      - type: object
        properties:
          parent:
            type: integer
            description: The id for the parent of the object.
          menu_order:
            type: integer
            description: The order of the object in relation to other object of its type.
          template:
            type: integer
            description: The theme file to use to display the object.
parameters:
  id:
    name: id
    in: path
    type: string
    description: Id of object
    required: true
  revisionid:
    name: revisionid
    in: path
    type: string
    description: Id of revision
    required: true
  force:
    name: force
    in: query
    description: Whether to bypass trash and force deletion.
    type: boolean
    required: false
  context:
    name: context
    in: query
    required: false
    description: >-
      Scope under which the request is made; determines fields present in
      response.
    type: string
    enum:
      - view
      - embed
      - edit
  page:
    name: page
    in: formData
    required: false
    description: Current page of the collection. Default 1
    type: integer
  per_page:
    in: formData
    name: per_page
    required: false
    description: Maximum number of items to be returned in result set. Default 10
    type: integer
  search:
    name: search
    description: Limit results to those matching a string.
    type: string
    required: false
    in: formData
  after:
    name: after
    description: >-
      Limit response to resources published after a given ISO8601 compliant
      date.
    type: string
    required: false
    in: formData
  author:
    name: author
    in: formData
    description: Limit result set to posts assigned to specific authors.
    type: string
    required: false
  author_exclude:
    name: author_exclude
    description: Ensure result set excludes posts assigned to specific authors.
    type: string
    required: false
    in: formData
  before:
    name: before
    description: >-
      Limit response to resources published before a given ISO8601 compliant
      date.
    type: string
    in: formData
    required: false
  exclude:
    name: exclude
    description: Ensure result set excludes specific ids.
    type: string
    in: formData
    required: false
  include:
    name: include
    description: Ensure result set includes specific ids.
    type: string
    in: formData
    required: false
  offset:
    name: offset
    description: Offset the result set by a specific number of items.
    type: string
    required: false
    in: formData
  order:
    name: order
    description: Order sort attribute ascending or descending. Default desc
    type: string
    required: false
    enum:
      - desc
      - asc
    in: formData
  orderby:
    name: orderby
    description: Sort collection by object attribute. Default date
    type: string
    required: false
    enum:
      - date
      - id
      - include
      - title
      - slug
    in: formData
  slug:
    name: slug
    description: Limit result set to posts with a specific slug.
    type: string
    required: false
    in: formData
  status:
    name: status
    description: Limit result set to posts assigned a specific status.Default publish
    type: string
    enum:
      - publish
      - future
      - draft
      - pending
      - private
    required: false
    in: formData
  filter:
    name: filter
    description: >-
      Use WP Query arguments to modify the response; private query vars require
      appropriate authorization.
    type: string
    required: false
    in: formData
  categories:
    name: categories
    description: >-
      Limit result set to all items that have the specified term assigned in the
      categories taxonomy.
    type: array
    required: false
    items:
      type: string
    in: formData
  tags:
    name: tags
    description: >-
      Limit result set to all items that have the specified term assigned in the
      tags taxonomy.
    type: array
    required: false
    items:
      type: string
    in: formData
  date:
    name: date
    type: string
    description: 'The date the object was published, in the site''s timezone.'
    format: date-time
    in: formData
    required: false
  date_gmt:
    name: date_gmt
    type: string
    description: 'The date the object was published, as GMT.'
    format: date-time
    in: formData
    required: false
  password:
    name: password
    type: string
    description: The A password to protect access to the post.
    in: formData
    required: false
  title:
    name: title
    type: string
    description: The title for the object.
    in: formData
    required: false
  content:
    name: content
    type: string
    description: The content for the object.
    in: formData
    required: false
  excerpt:
    name: excerpt
    type: string
    description: The excerpt for the object
    in: formData
    required: false
  featured_media:
    name: featured_media
    type: string
    description: The id of the featured media for the object.
    in: formData
    required: false
  comment_status:
    name: comment_status
    type: string
    enum:
      - open
      - closed
    description: Whether or not comments are open on the object
    in: formData
    required: false
  ping_status:
    name: ping_status
    type: string
    enum:
      - open
      - closed
    description: Whether or not the object can be pinged.
    in: formData
    required: false
  sticky:
    name: sticky
    type: boolean
    description: Whether or not the object should be treated as sticky.
    in: formData
    required: false
  parent:
    name: parent
    type: integer
    description: The id for the parent of the object.
    in: formData
    required: false
  menu_order:
    name: menu_order
    type: integer
    description: The order of the object in relation to other object of its type.
    in: formData
    required: false
  template:
    name: template
    type: integer
    description: The theme file to use to display the object.
    in: formData
    required: false
  parent_exclude:
    name: parent_exclude
    description: Ensure result set excludes specific ids.
    type: string
    in: formData
    required: false
  post:
    name: post
    description: The id for the associated post of the resource.
    type: string
    in: formData
    required: false
  description:
    name: description
    description: The description for the resource
    type: string
    in: formData
    required: false
  caption:
    name: caption
    description: The caption for the resource.
    type: string
    in: formData
    required: false
  alt_text:
    name: alt_text
    description: Alternative text to display when resource is not displayed.
    type: string
    in: formData
    required: false
  author_email:
    name: author_email
    description: >-
      Limit result set to that from a specific author email. Requires
      authorization.
    type: string
    in: formData
    required: false
  karma:
    name: karma
    description: >-
      Limit result set to that of a particular comment karma. Requires
      authorization
    type: string
    in: formData
    required: false
  name:
    name: name
    description: HTML title for the resource.
    type: string
    in: formData
    required: true
  hide_empty:
    name: hide_empty
    description: Whether to hide resources not assigned to any posts.
    type: boolean
    in: formData
    required: false
  nickname:
    name: nickname
    description: The nickname for the resource.
    type: string
    in: formData
    required: false
  last_name:
    name: last_name
    description: The last name for the resource.
    type: string
    in: formData
    required: false
  first_name:
    name: first_name
    description: The first name for the resource.
    type: string
    in: formData
    required: false
  username:
    name: username
    description: The user name for the resource.
    type: string
    in: formData
    required: false
  url:
    name: url
    description: URL of the resource.
    format: url
    type: string
    in: formData
    required: false
  email:
    name: email
    description: Email of the resource.
    format: email
    type: string
    in: formData
    required: false
  type:
    name: type
    description: >-
      Limit result set to comments assigned a specific type. Requires
      authorization. Default comment
    type: string
    in: formData
    required: false
  media_type:
    name: media_type
    description: Type of resource.
    type: string
    enum:
      - file
      - image
    in: formData
    required: false
  mime_type:
    name: mime_type
    description: Alternative text to display when resource is not displayed.
    type: string
    in: formData
    required: false
  capabilities:
    name: capabilities
    type: array
    description: All capabilities used by the resource.
    in: formData
    required: false
    items:
      type: string
  roles:
    name: roles
    type: array
    description: Roles assigned to the resource.
    in: formData
    required: false
    items:
      type: string
  reassign:
    name: reassign
    type: string
    in: formData
    required: false`;
