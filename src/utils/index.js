export function formatResponse(data, message = 'Success') {
    return {
        status: 'success',
        message,
        data,
    };
}

export function handleError(error, message = 'An error occurred') {
    return {
        status: 'error',
        message,
        error: error.message || error,
    };
}

export function validateInput(input, schema) {
    const { error } = schema.validate(input);
    return error ? error.details[0].message : null;
}