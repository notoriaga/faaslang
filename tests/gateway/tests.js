const http = require('http');
const FormData = require('form-data');
const {Gateway, FunctionParser} = require('../../index.js');

const PORT = 7357;
const HOST = 'localhost'
const ROOT = './tests/gateway';

const FaaSGateway = new Gateway({debug: true, root: ROOT});
const parser = new FunctionParser();

function request(method, headers, path, data, callback) {
  headers = headers || {};
  method = method || 'GET';
  path = path || '';
  path = path.startsWith('/') ? path : `/${path}`;
  if (typeof data === 'object') {
    data = JSON.stringify(data);
    headers['Content-Type'] = 'application/json';
  } else if (typeof data === 'string') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }
  data = data || '';
  let req = http.request({
    host: HOST,
    port: PORT,
    path: path,
    method: method,
    headers: headers
  }, (res) => {
    let buffers = [];
    res.on('data', chunk => buffers.push(chunk));
    res.on('end', () => {
      let result = Buffer.concat(buffers);
      if ((res.headers['content-type'] || '').split(';')[0] === 'application/json') {
        result = JSON.parse(result.toString());
      }
      callback(null, res, result);
    });
    res.on('error', err => callback(err));
  });
  req.end(data);
}

module.exports = (expect) => {

  before(() => {
    FaaSGateway.listen(PORT);
    FaaSGateway.define(parser.load(ROOT, 'functions'));
  });

  it('Should setup correctly', () => {

    expect(FaaSGateway.server).to.exist;
    expect(FaaSGateway.definitions).to.exist;
    expect(FaaSGateway.definitions).to.haveOwnProperty('my_function');

  });

  it('Should return 404 + ClientError for not found function', done => {
    request('GET', {}, '/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(404);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ClientError');
      done();

    });
  });

  it('Should return 302 redirect when missing trailing / with user agent', done => {
    request('GET', {'user-agent': 'testing'}, '/my_function', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(302);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers).to.haveOwnProperty('location');
      expect(res.headers.location).to.equal('/my_function/');
      done();

    });
  });

  it('Should not return 302 redirect when missing trailing / without user agent', done => {
    request('GET', {}, '/my_function', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.not.equal(302);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      done();

    });
  });

  it('Should give 200 OK and property headers for OPTIONS', done => {
    request('OPTIONS', {}, '/my_function/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      done();

    });
  });

  it('Should give 200 OK and property headers for HEAD', done => {
    request('HEAD', {}, '/my_function/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      done();

    });
  });

  it('Should return 200 OK when no Content-Type specified on GET', done => {
    request('GET', {}, '/my_function/', undefined, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal(6);
      done();

    });
  });

  it('Should return 400 Bad Request + ClientError when no Content-Type specified on POST', done => {
    request('POST', {}, '/my_function/', undefined, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ClientError');
      done();

    });
  });

  it('Should return 200 OK + result when executed', done => {
    request('GET', {}, '/my_function/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal(6);
      done();

    });
  });

  it('Should parse arguments from URL', done => {
    request('GET', {}, '/my_function/?a=10&b=20&c=30', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal(60);
      done();

    });
  });

  it('Should parse arguments from POST (URL encoded)', done => {
    request('POST', {}, '/my_function/', 'a=10&b=20&c=30', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal(60);
      done();

    });
  });

  it('Should not overwrite POST (URL encoded) data with query parameters', done => {
    request('POST', {}, '/my_function/?c=300', 'a=10&b=20&c=30', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ClientError');
      done();

    });
  });

  it('Should parse arguments from POST (JSON)', done => {
    request('POST', {}, '/my_function/', {a: 10, b: 20, c: 30}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal(60);
      done();

    });
  });

  it('Should not overwrite POST (JSON) data with query parameters', done => {
    request('POST', {}, '/my_function/?c=300', {a: 10, b: 20, c: 30}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ClientError');
      done();

    });
  });

  it('Should not parse arguments from POST (JSON Array)', done => {
    request('POST', {}, '/my_function/', [10, 20, 30], (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ClientError');
      expect(result.error.message).to.equal('Bad Request: Invalid JSON: Must be Object');
      done();

    });
  });

  it('Should give ParameterError if parameter doesn\'t match (converted)', done => {
    request('POST', {}, '/my_function/', 'a=10&b=20&c=hello%20world', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterError');
      expect(result.error.details).to.exist;
      expect(result.error.details.c).to.exist;
      expect(result.error.details.c.expected).to.exist;
      expect(result.error.details.c.expected.type).to.equal('number');
      expect(result.error.details.c.actual).to.exist;
      expect(result.error.details.c.actual.type).to.equal('string');
      expect(result.error.details.c.actual.value).to.equal('hello world');
      done();

    });
  });

  it('Should give ParameterError if parameter doesn\'t match (not converted)', done => {
    request('POST', {}, '/my_function/', {a: 10, b: 20, c: '30'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterError');
      expect(result.error.details).to.exist;
      expect(result.error.details.c).to.exist;
      expect(result.error.details.c.expected).to.exist;
      expect(result.error.details.c.expected.type).to.equal('number');
      expect(result.error.details.c.actual).to.exist;
      expect(result.error.details.c.actual.type).to.equal('string');
      expect(result.error.details.c.actual.value).to.equal('30');
      done();

    });
  });

  it('Should give 502 + ValueError if unexpected value', done => {
    request('POST', {}, '/my_function/', {c: 100}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ValueError');
      expect(result.error.details).to.exist;
      expect(result.error.details.returns).to.exist;
      expect(result.error.details.returns.message).to.exist;
      expect(result.error.details.returns.expected).to.exist;
      expect(result.error.details.returns.expected.type).to.equal('number');
      expect(result.error.details.returns.actual).to.exist;
      expect(result.error.details.returns.actual.type).to.equal('string');
      expect(result.error.details.returns.actual.value).to.equal('hello value');
      done();

    });
  });

  it('Should give 200 OK for not found function', done => {
    request('POST', {}, '/test/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal('not found?');
      done();

    });
  });

  it('Should allow status setting from third callback parameter', done => {
    request('POST', {}, '/test/status/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(404);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.be.instanceof(Buffer);
      expect(result.toString()).to.equal('not found');
      done();

    });
  });

  it('Should pass headers properly', done => {
    request('POST', {}, '/headers/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('text/html');
      expect(result).to.be.instanceof(Buffer);
      expect(result.toString()).to.equal('abcdef');
      done();

    });
  });

  it('Should parse object properly', done => {
    request('POST', {}, '/object_parsing/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal(null);
      done();

    });
  });

  it('Should populate HTTP body', done => {
    request('POST', {}, '/http_body/', {abc: 123}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.be.a.string;
      expect(result).to.equal('{"abc":123}');
      done();

    });
  });

  it('Should null number properly (POST)', done => {
    request('POST', {}, '/number_nullable/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.be.an.array;
      expect(result[0]).to.equal(null);
      expect(result[1]).to.equal(null);
      done();

    });
  });

  it('Should null number properly (GET)', done => {
    request('GET', {}, '/number_nullable/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.be.an.array;
      expect(result[0]).to.equal(null);
      expect(result[1]).to.equal(null);
      done();

    });
  });

  it('Should error object on string provided', done => {
    request('POST', {}, '/object_parsing/', {obj: 'xxx'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterError');
      expect(result.error.details).to.exist;
      expect(result.error.details.obj).to.exist;
      expect(result.error.details.obj.message).to.exist;
      expect(result.error.details.obj.expected).to.exist;
      expect(result.error.details.obj.expected.type).to.equal('object');
      expect(result.error.details.obj.actual).to.exist;
      expect(result.error.details.obj.actual.type).to.equal('string');
      expect(result.error.details.obj.actual.value).to.equal('xxx');
      done();

    });
  });

  it('Should reject integer type when provided float (GET)', done => {
    request('GET', {}, '/type_rejection/?alpha=47.2', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterError');
      expect(result.error.details).to.exist;
      expect(result.error.details.alpha).to.exist;
      expect(result.error.details.alpha.message).to.exist;
      expect(result.error.details.alpha.expected).to.exist;
      expect(result.error.details.alpha.expected.type).to.equal('integer');
      expect(result.error.details.alpha.actual).to.exist;
      expect(result.error.details.alpha.actual.type).to.equal('number');
      expect(result.error.details.alpha.actual.value).to.equal(47.2);
      done();

    });
  });

  it('Should reject integer type when provided float (POST)', done => {
    request('POST', {}, '/type_rejection/', {alpha: 47.2}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterError');
      expect(result.error.details).to.exist;
      expect(result.error.details.alpha).to.exist;
      expect(result.error.details.alpha.message).to.exist;
      expect(result.error.details.alpha.expected).to.exist;
      expect(result.error.details.alpha.expected.type).to.equal('integer');
      expect(result.error.details.alpha.actual).to.exist;
      expect(result.error.details.alpha.actual.type).to.equal('number');
      expect(result.error.details.alpha.actual.value).to.equal(47.2);
      done();

    });
  });

  it('Should accept integer type when provided integer (GET)', done => {
    request('GET', {}, '/type_rejection/?alpha=47', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal(47);
      done();

    });
  });

  it('Should accept integer type when provided integer (POST)', done => {
    request('POST', {}, '/type_rejection/', {alpha: 47}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal(47);
      done();

    });
  });

  it('Should not accept empty object.http', done => {
    request('GET', {}, '/sanitize/http_object_empty/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(result.error.details.returns).to.exist
      expect(result.error.details.returns.invalid).to.equal(true);
      done();

    });
  });

  it('Should sanitize a {_base64: ...} buffer input', done => {
    request('GET', {}, '/sanitize/http_object_base64/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result.error).to.not.exist;
      expect(result.toString()).to.equal('fix for steven');
      done();

    });
  });

  it('Should accept uppercase Content-Type', done => {
    request('GET', {}, '/sanitize/http_object_header_case/?contentType=image/png', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.exist;
      expect(res.headers).to.haveOwnProperty('content-type');
      expect(res.headers['content-type']).to.equal('image/png');
      done();

    });
  });

  it('Should not accept object.http with null body', done => {
    request('GET', {}, '/sanitize/http_object/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(result.error.details.returns).to.exist
      expect(result.error.details.returns.invalid).to.equal(true);
      done();


    });
  });

  it('Should accept object.http with string body', done => {
    request('GET', {}, '/sanitize/http_object/?body=hello', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/plain');
      expect(result.toString()).to.equal('hello');
      done();

    });
  });

  it('Should not accept object.http with statusCode out of range', done => {
    request('GET', {}, '/sanitize/http_object/?statusCode=600', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(result.error.details.returns).to.exist
      expect(result.error.details.returns.invalid).to.equal(true);
      done();


    });
  });

  it('Should not accept object.http with invalid headers object', done => {
    request('POST', {}, '/sanitize/http_object/', {headers: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(result.error.details.returns).to.exist
      expect(result.error.details.returns.invalid).to.equal(true);
      done();


    });
  });

  it('Should allow header setting', done => {
    request('POST', {}, '/sanitize/http_object/', {body: '<b>hello</b>', headers: {'content-type': 'text/html'}}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/html');
      expect(result.toString()).to.equal('<b>hello</b>');
      done();

    });
  });

  it('Should overwrite access-control-allow-origin', done => {
    request('POST', {}, '/sanitize/http_object/', {body: '<b>hello</b>', headers: {'access-control-allow-origin': '$'}}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['access-control-allow-origin']).to.equal('$');
      expect(result.toString()).to.equal('<b>hello</b>');
      done();

    });
  });

  it('Should NOT overwrite x-faaslang', done => {
    request('POST', {}, '/sanitize/http_object/', {body: '<b>hello</b>', headers: {'x-faaslang': '$'}}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['x-faaslang']).to.not.equal('$');
      expect(result.toString()).to.equal('<b>hello</b>');
      done();

    });
  });

  it('Should run a background function', done => {
    request('POST', {}, '/bg/:bg', {data: 'xxx'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(202);
      expect(result).to.exist;
      expect(result).to.be.instanceof(Buffer);
      expect(result.length).to.be.greaterThan(0);
      done();

    });
  });

  it('Should return 302 redirect with correct url when running a background function missing a slash before :bg and at end of url', done => {
    request('POST', {'user-agent': 'testing'}, '/bg:bg', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(302);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers).to.haveOwnProperty('location');
      expect(res.headers.location).to.equal('/bg/:bg');
      done();

    });
  });

  it('Should return 302 redirect with correct url when running a background function missing a slash before :bg but with slash at end of url', done => {
    request('POST', {'user-agent': 'testing'}, '/bg:bg/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(302);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers).to.haveOwnProperty('location');
      expect(res.headers.location).to.equal('/bg/:bg');
      done();

    });
  });

  it('Should return 302 redirect with correct url when running a background function missing a slash before :bg and at end of url with a query', done => {
    request('POST', {'user-agent': 'testing'}, '/bg:bg?test=param', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(302);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers).to.haveOwnProperty('location');
      expect(res.headers.location).to.equal('/bg/:bg?test=param');
      done();

    });
  });

  it('Should return 302 redirect with correct url when running a background function missing a slash before :bg but with slash at end of url with a query', done => {
    request('POST', {'user-agent': 'testing'}, '/bg:bg/?test=param', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(302);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers).to.haveOwnProperty('location');
      expect(res.headers.location).to.equal('/bg/:bg?test=param');
      done();

    });
  });

  it('Should run a background function with bg mode "info"', done => {
    request('POST', {}, '/bg/info/:bg', {data: 'xxx'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(202);
      expect(result).to.exist;
      expect(result).to.be.instanceof(Buffer);
      expect(result.length).to.be.greaterThan(0);
      done();

    });
  });

  it('Should run a background function with bg mode "empty"', done => {
    request('POST', {}, '/bg/empty/:bg', {data: 'xxx'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(202);
      expect(result).to.exist;
      expect(result).to.be.instanceof(Buffer);
      expect(result.length).to.equal(0);
      done();

    });
  });

  it('Should run a background function with bg mode "params"', done => {
    request('POST', {}, '/bg/params/:bg', {data: 'xxx'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(202);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result).to.haveOwnProperty('data');
      expect(result.data).to.equal('xxx');
      done();

    });
  });

  it('Should run a background function with bg mode "params" looking for a specific parameter', done => {
    request('POST', {}, '/bg/paramsSpecific1/:bg', {data: 'xxx', discarded: 'xxx'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(202);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result).to.haveOwnProperty('data');
      expect(result).to.not.haveOwnProperty('discarded');
      expect(result.data).to.equal('xxx');
      done();

    });
  });

  it('Should run a background function with bg mode "params" looking for two specific parameters', done => {
    request('POST', {}, '/bg/paramsSpecific2/:bg', {data: 'xxx', otherdata: 'xxx', discarded: 'xxx'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(202);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result).to.haveOwnProperty('data');
      expect(result).to.haveOwnProperty('otherdata');
      expect(result.data).to.equal('xxx');
      expect(result.otherdata).to.equal('xxx');
      done();

    });
  });

  it('Should run a background function with bg mode "params" looking for specific param that is not there', done => {
    request('POST', {}, '/bg/paramsSpecific3/:bg', {otherdata: 'xxx'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(202);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result).to.not.haveOwnProperty('data');
      done();

    });
  });

  it('Should register a runtime error properly', done => {
    request('POST', {}, '/runtime/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('RuntimeError');
      done();

    });
  });

  it('Should register a fatal error properly', done => {
    request('POST', {}, '/runtime/fatal/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(500);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('FatalError');
      done();

    });
  });

  it('Should register a thrown error properly', done => {
    request('POST', {}, '/runtime/thrown/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('RuntimeError');
      done();

    });
  });

  it('Should register an uncaught promise', done => {
    request('POST', {}, '/runtime/promise_uncaught/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('RuntimeError');
      done();

    });
  });

  it('Should respond to an array as an implementation error', done => {
    request('POST', {}, '/runtime/array/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('RuntimeError');
      done();

    });
  });

  it('Should respond to a boolean as an implementation error', done => {
    request('POST', {}, '/runtime/boolean/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('RuntimeError');
      done();

    });
  });

  it('Should respond to a number as an implementation error', done => {
    request('POST', {}, '/runtime/number/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('RuntimeError');
      done();

    });
  });

  it('Should respond to an object as an implementation error', done => {
    request('POST', {}, '/runtime/object/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('RuntimeError');
      done();

    });
  });

  it('Should respond to a string as an implementation error', done => {
    request('POST', {}, '/runtime/string/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('RuntimeError');
      done();

    });
  });

  it('Should handle multipart/form-data', done => {

    let form = new FormData();
    form.append('my_field', 'my value');
    form.append('my_other_field', 'my other value');

    form.submit(`http://${HOST}:${PORT}/reflect`, (err, response) => {

      expect(err).to.not.exist;
      expect(response.statusCode).to.equal(200);

      let body = [];
      response.on('readable', function() {
          body.push(response.read());
      });

      response.on('end', function() {
        let results = JSON.parse(body);
        expect(results.my_field).to.equal('my value');
        expect(results.my_other_field).to.equal('my other value');
        done();
      });

      response.on('err', function(err) {
        expect(err).to.not.exist;
        done();
      })

    })
  });

  it('Should handle multipart/form-data with buffer', done => {
    const fs = require('fs')
    let pkgJson = fs.readFileSync(process.cwd() + '/package.json')

    let form = new FormData();
    form.append('my_field', 'my value');
    form.append('my_string_buffer', Buffer.from('123'));
    form.append('my_file_buffer', pkgJson);

    form.submit(`http://${HOST}:${PORT}/reflect`, (err, response) => {

      expect(err).to.not.exist;
      expect(response.statusCode).to.equal(200);

      let body = [];
      response.on('readable', function() { body.push(response.read()); });

      response.on('end', function() {
        let results = JSON.parse(body);
        let stringBuffer = Buffer.from(results.my_string_buffer.data)
        let fileBuffer = Buffer.from(results.my_file_buffer.data)
        expect(results.my_field).to.equal('my value');
        expect(stringBuffer).to.be.deep.equal(Buffer.from('123'))
        expect(fileBuffer).to.be.deep.equal(pkgJson)
        done();
      });

      response.on('err', function(err) {
        expect(err).to.not.exist;
        done();
      })

    })
  });

  it('Should handle multipart/form-data with json', done => {

    let form = new FormData();
    form.append('my_field', 'my value');
    form.append('my_json', JSON.stringify({
      someJsonNums: 123,
      someJson: 'hello'
    }), 'my.json');

    form.submit(`http://${HOST}:${PORT}/reflect`, (err, response) => {

      expect(err).to.not.exist;
      expect(response.statusCode).to.equal(200);

      let body = [];
      response.on('readable', function() {
          body.push(response.read());
      });

      response.on('end', function() {
        let results = JSON.parse(body);
        expect(results.my_field).to.equal('my value');
        expect(results.my_json).to.deep.equal({
          someJsonNums: 123,
          someJson: 'hello'
        });
        done();
      });

      response.on('err', function(err) {
        expect(err).to.not.exist;
        done();
      })

    })
  });

  it('Should handle multipart/form-data with bad json', done => {

    let form = new FormData();
    form.append('my_field', 'my value');
    form.append('my_json', 'totally not json', 'my.json');

    form.submit(`http://${HOST}:${PORT}/reflect`, (err, response) => {

      expect(err).to.not.exist;
      expect(response.statusCode).to.equal(400);

      let body = [];
      response.on('readable', function() {
          body.push(response.read());
      });

      response.on('end', function() {
        let results = JSON.parse(body);
        expect(results.error).to.exist
        expect(results.error.message).to.equal('Bad Request: Invalid multipart form-data with key: my_json')
        done();
      });

      response.on('err', function(err) {
        expect(err).to.not.exist;
        done();
      })

    })
  });

  it('Should reject an object that doesn\'t map to Schema', done => {
    request('POST', {}, '/schema_rejection/', {
      obj: {
        name: 'hello',
        enabled: true,
        data: 'xxx',
        timestamp: 1337
      }
    },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterError');
      expect(result.error.details).to.exist;
      expect(result.error.details.obj).to.exist;
      expect(result.error.details.obj.expected).to.exist;
      expect(result.error.details.obj.expected.type).to.equal('object');
      expect(result.error.details.obj.expected.schema).to.exist;
      expect(result.error.details.obj.expected.schema).to.have.length(4);
      expect(result.error.details.obj.expected.schema[0].name).to.equal('name');
      expect(result.error.details.obj.expected.schema[0].type).to.equal('string');
      expect(result.error.details.obj.expected.schema[1].name).to.equal('enabled');
      expect(result.error.details.obj.expected.schema[1].type).to.equal('boolean');
      expect(result.error.details.obj.expected.schema[2].name).to.equal('data');
      expect(result.error.details.obj.expected.schema[2].type).to.equal('object');
      expect(result.error.details.obj.expected.schema[2].schema).to.exist;
      expect(result.error.details.obj.expected.schema[2].schema).to.have.length(2);
      expect(result.error.details.obj.expected.schema[2].schema[0].name).to.equal('a');
      expect(result.error.details.obj.expected.schema[2].schema[0].type).to.equal('string');
      expect(result.error.details.obj.expected.schema[2].schema[1].name).to.equal('b');
      expect(result.error.details.obj.expected.schema[2].schema[1].type).to.equal('string');
      expect(result.error.details.obj.expected.schema[3].name).to.equal('timestamp');
      expect(result.error.details.obj.expected.schema[3].type).to.equal('number');
      expect(result.error.details.obj.actual).to.exist;
      expect(result.error.details.obj.actual.type).to.equal('object');
      expect(result.error.details.obj.actual.value).to.deep.equal({
        name: 'hello',
        enabled: true,
        data: 'xxx',
        timestamp: 1337
      });
      done();

    });
  });

  it('Should accept an object that correctly maps to Schema', done => {
    request('POST', {}, '/schema_rejection/', {
      obj: {
        name: 'hello',
        enabled: true,
        data: {a: 'alpha', b: 'beta'},
        timestamp: 1337
      }
    },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal('hello');
      done();

    });
  });

  it('Should reject an array that doesn\'t map to Schema', done => {
    request('POST', {}, '/schema_rejection_array/', {
      users: ['alpha', 'beta']
    },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterError');
      expect(result.error.details).to.exist;
      expect(result.error.details.users).to.exist;
      expect(result.error.details.users.expected).to.exist;
      expect(result.error.details.users.expected.type).to.equal('array');
      expect(result.error.details.users.expected.schema).to.exist;
      expect(result.error.details.users.expected.schema).to.have.length(1);
      expect(result.error.details.users.expected.schema[0].name).to.equal('user');
      expect(result.error.details.users.expected.schema[0].type).to.equal('object');
      expect(result.error.details.users.expected.schema[0].schema).to.exist;
      expect(result.error.details.users.expected.schema[0].schema).to.have.length(2);
      expect(result.error.details.users.expected.schema[0].schema[0].name).to.equal('username');
      expect(result.error.details.users.expected.schema[0].schema[0].type).to.equal('string');
      expect(result.error.details.users.expected.schema[0].schema[1].name).to.equal('age');
      expect(result.error.details.users.expected.schema[0].schema[1].type).to.equal('number');
      expect(result.error.details.users.actual).to.exist;
      expect(result.error.details.users.actual.type).to.equal('array');
      expect(result.error.details.users.actual.value).to.deep.equal(['alpha', 'beta']);
      done();

    });
  });

  it('Should accept an array that correctly maps to Schema', done => {
    request('POST', {}, '/schema_rejection_array/', {
      users: [
        {
          username: 'alpha',
          age: 1
        },
        {
          username: 'beta',
          age: 2
        }
      ]
    },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal('hello');
      done();

    });
  });

  it('Should reject an nested array that doesn\'t map to Schema', done => {
    request('POST', {}, '/schema_rejection_nested_array/', {
      users: [
        { username: 'steve', posts: [{ title: 't', body: 'b' }] },
        { posts: [{ title: 't', body: 'b' }] }
      ]
    },
      (err, res, result) => {

        expect(err).to.not.exist;
        expect(res.statusCode).to.equal(400);
        expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
        expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
        expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
        expect(result.error).to.exist;
        expect(result.error.type).to.equal('ParameterError');
        expect(result.error.details).to.exist;
        expect(result.error.details.users).to.exist;
        expect(result.error.details.users.expected).to.exist;
        expect(result.error.details.users.expected.type).to.equal('array');
        expect(result.error.details.users.expected.schema).to.deep.equal([
          {
            name: 'user',
            type: 'object',
            description: 'a user',
            schema: [
              {
                name: 'username',
                type: 'string',
                description: ''
              },
              {
                name: 'posts',
                type: 'array',
                description: '',
                schema: [
                  {
                    name: 'post',
                    type: 'object',
                    description: '',
                    schema: [
                      {
                        name: 'title',
                        type: 'string',
                        description: ''
                      },
                      {
                        name: 'body',
                        type: 'string',
                        description: ''
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]);
        expect(result.error.details.users.actual).to.deep.equal({
          type: 'array',
          value: [
            {
              posts: [
                {
                  body: 'b',
                  title: 't'
                }
              ],
              username: 'steve'
            },
            {
              posts: [
                {
                  body: 'b',
                  title: 't'
                }
              ]
            }
          ]
        });
        done();

      });
  });

  it('Should accept a nested array that correctly maps to Schema', done => {
    request('POST', {}, '/schema_rejection_nested_array/', {
      users: [
        { username: 'steve', posts: [{ title: 't', body: 'b' }] },
        { username: 'steve2', posts: [{ title: 't', body: 'b' }] }
      ]
    },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.deep.equal( [
        { username: 'steve', posts: [{ title: 't', body: 'b' }] },
        { username: 'steve2', posts: [{ title: 't', body: 'b' }] }
      ]);
      done();

    });
  });

  it('Should reject an array that doesn\'t map to a Schema for an array of numbers', done => {
    request('POST', {}, '/schema_rejection_number_array/', {
      userIds: ['alpha', 'beta']
    },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterError');
      expect(result.error.details).to.exist;
      expect(result.error.details.userIds).to.exist;
      expect(result.error.details.userIds.expected).to.exist;
      expect(result.error.details.userIds.expected.type).to.equal('array');
      expect(result.error.details.userIds.expected.schema).to.exist;
      expect(result.error.details.userIds.expected.schema).to.have.length(1);
      expect(result.error.details.userIds.expected.schema[0].type).to.equal('number');
      expect(result.error.details.userIds.actual).to.exist;
      expect(result.error.details.userIds.actual.type).to.equal('array');
      expect(result.error.details.userIds.actual.value).to.deep.equal(['alpha', 'beta']);
      done();

    });
  });

  it('Should accept an array that correctly maps to Schema', done => {
    request('POST', {}, '/schema_rejection_number_array/', {
      userIds: [1, 2, 3]
    },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal('hello');
      done();

    });
  });

  it('Should handle large buffer parameters', done => {
    request('POST', {'x-convert-strings': true}, '/runtime/largebuffer/', {
      file: `{"_base64": "${'a'.repeat(50000000)}"}`
    }, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result.error).to.not.exist;
      done();

    });
  }).timeout(5000);

  it('Should accept a request with the optional param', done => {
    request('POST', {}, '/optional_params/', {name: 'steve'},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal('steve');
      done();

    });
  });

  it('Should accept a request without the optional param', done => {
    request('POST', {}, '/optional_params/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal('hello');
      done();

    });
  });

  it('Should accept a request without the optional param', done => {
    request('POST', {}, '/schema_optional_params/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal(null);
      done();

    });
  });

  it('Should accept a request without the optional param field', done => {
    request('POST', {}, '/schema_optional_params/', {obj: {name: 'steve'}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.deep.equal({name: 'steve'});
      done();

    });
  });

  it('Should accept a request with the optional param field set to null', done => {
    request('POST', {}, '/schema_optional_params/', {obj: {name: 'steve', enabled: null}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.deep.equal({name: 'steve', enabled: null});
      done();

    });
  });

  it('Should accept a request with the optional param field', done => {
    request('POST', {}, '/schema_optional_params/', {obj: {name: 'steve', enabled: true}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.deep.equal({name: 'steve', enabled: true});
      done();

    });
  });

  it('Should accept a request without the optional param (nested schema)', done => {
    request('POST', {}, '/optional_nested_schema_params/', {obj: {name: 'steve' }},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.deep.equal({name: 'steve'});
      done();

    });
  });

  it('Should reject a request without the required param within the optional object (nested schema)', done => {
    request('POST', {}, '/optional_nested_schema_params/', {obj: {name: 'steve', options: {}}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });


  it('Should accept a request with the optional object (nested schema)', done => {
    request('POST', {}, '/optional_nested_schema_params/', {obj: {name: 'steve', options: {istest: true}}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.deep.equal({name: 'steve', options: { istest: true}});
      done();

    });
  });

  it('Should accept a request with the optional object and optional field (nested schema)', done => {
    request('POST', {}, '/optional_nested_schema_params/', {obj: {name: 'steve', options: {istest: true, threads: 4}}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.deep.equal({name: 'steve', options: { istest: true, threads: 4}});
      done();

    });
  });

  it('Should successfully return a request without the optional value', done => {
    request('POST', {}, '/optional_nested_schema_params/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal(null);
      done();

    });
  });


  it('Should successfully return a request without the optional values', done => {
    request('POST', {}, '/optional_nested_schema_params/', {obj: {name: 'steve'}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.deep.equal({name: 'steve'});
      done();

    });
  });

  it('Should successfully return a request with the optional values', done => {
    request('POST', {}, '/optional_nested_schema_params/', {obj: {name: 'steve', options: {istest: true}}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.deep.equal({name: 'steve', options: {istest: true}});
      done();

    });
  });

  it('Should successfully return a request with the optional values and fields', done => {
    request('POST', {}, '/optional_nested_schema_params/', {obj: {name: 'steve', options: {istest: true, threads: 4}}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.deep.equal({name: 'steve', options: {istest: true, threads: 4}});
      done();

    });
  });

  it('Should successfully return a default value with an optional field', done => {
    request('POST', {}, '/optional_param_not_null/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.equal('default');
      done();

    });
  });

  it('Should successfully return a schema with a default set to 0', done => {
    request('POST', {}, '/stripe/', {id: '0'},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      done();

    });
  });

  it('Should successfully return a schema with an array', done => {
    request('POST', {}, '/giphy/', {query: 'q'},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      done();

    });
  });

  it('Should successfully return a default parameter after passing in null', done => {
    request('POST', {}, '/null_default_param/', {name: null},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal('default');
      done();

    });
  });

  it('Should successfully return a default parameter after passing in undefined', done => {
    request('POST', {}, '/null_default_param/', {name: undefined},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal('default');
      done();

    });
  });

  after(() => FaaSGateway.close());

};