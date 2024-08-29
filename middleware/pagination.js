// /middleware/pagination.js
function paginate(req, res, next) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    req.pagination = { limit, offset };
    next();
}

function sortAndFilter(req, res, next) {
    const { sortBy = 'createdAt', sortOrder = 'ASC', filterField, filterValue } = req.query;

    req.sort = { sortBy, sortOrder };
    req.filter = filterField && filterValue ? { [filterField]: filterValue } : {};

    next();
}

module.exports = { paginate, sortAndFilter };
