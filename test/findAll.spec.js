describe('DSRedisAdapter#findAll', function () {
  it('should filter users', function () {
    var id;

    return adapter.findAll(User, {
      age: 30
    }).then(function (users) {
      assert.equal(users.length, 0);
      return adapter.create(User, { name: 'John' });
    }).then(function (user) {
      id = user.id;
      return adapter.findAll(User, {
        name: 'John'
      });
    }).then(function (users) {
      assert.equal(users.length, 1);
      assert.deepEqual(users[0], { id: id, name: 'John' });
      return adapter.destroy(User, id);
    }).then(function (destroyedUser) {
      assert.isFalse(!!destroyedUser);
    });
  });
  it('should load relations', function () {
    return store.utils.Promise.all([
      adapter.create(User, { name: 'foo' }).then(function (user) {
        return store.utils.Promise.all([
          adapter.create(Post, { name: 'foo2', userId: user.id }).then(function (post) {
            return store.utils.Promise.all([
              adapter.create(Comment, { name: 'foo4', userId: user.id, postId: post.id }),
              adapter.create(Comment, { name: 'bar4', userId: user.id, postId: post.id })
            ])
          })
        ]);
      }),
      adapter.create(User, { name: 'bar' }).then(function (user) {
        return store.utils.Promise.all([
          adapter.create(Post, { name: 'foo3', userId: user.id }).then(function (post) {
            return store.utils.Promise.all([
              adapter.create(Comment, { name: 'foo5', userId: user.id, postId: post.id }),
              adapter.create(Comment, { name: 'bar5', userId: user.id, postId: post.id })
            ])
          })
        ]);
      })
    ]).then(function () {
      return adapter.findAll(Post, null, { with: ['user', 'comment'] });
    }).then(function (posts) {
      assert.equal(posts.length, 2);
      assert.equal(posts[0].comments.length, 2);
      assert.equal(posts[1].comments.length, 2);
      assert.equal(posts[0].user.id, posts[0].userId);
      assert.equal(posts[1].user.id, posts[1].userId);
      return adapter.destroyAll(Post);
    });
  });
});
