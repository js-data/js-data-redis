describe('DSRedisAdapter#find', function () {
  it('should find a user in Redis', function () {
    var id;
    return adapter.create(User, { name: 'John' })
      .then(function (user) {
        id = user.id;
        assert.equal(user.name, 'John');
        assert.isString(user.id);
        return adapter.find(User, user.id);
      })
      .then(function (user) {
        assert.equal(user.name, 'John');
        assert.isString(user.id);
        assert.deepEqual(user, { id: id, name: 'John' });
        return adapter.destroy(User, id);
      })
      .then(function (user) {
        assert.isFalse(!!user);
        return adapter.find(User, id);
      })
      .then(function () {
        throw new Error('Should not have reached here!');
      })
      .catch(function (err) {
        assert.equal(err.message, 'Not Found!');
      });
  });
});
