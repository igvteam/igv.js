//import resolve from 'rollup-plugin-node-resolve';
//import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default [

	{
		input: 'js/api.js',
		output: [
			{ file: pkg.module, format: 'es' }
		]
	},

	{
		input: 'js/api.js',
		output: [
			{ file: 'tmp/igv.js', format: 'umd', name:"igv" },
		],
		plugins: [
			resolve(),
			babel({
				exclude: 'node_modules/**'
			}),
		]
	}
];
