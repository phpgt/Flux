<?php

use Behat\Gherkin\Node\PyStringNode;
use Behat\Mink\Exception\ExpectationException;
use Behat\MinkExtension\Context\RawMinkContext;

/** Browser checks for computed CSS values and native layout/media behaviour. */
class CssPropertiesContext extends RawMinkContext {
	/** @Then the CSS property :property on :selector should become :value */
	public function propertyShouldBecome(string $property, string $selector, string $value):void {
		$propertyJson = json_encode($property, JSON_THROW_ON_ERROR);
		$selectorJson = json_encode($selector, JSON_THROW_ON_ERROR);
		$valueJson = json_encode($value, JSON_THROW_ON_ERROR);
		$this->waitForExpression(
			"document.querySelector($selectorJson) && getComputedStyle(document.querySelector($selectorJson)).getPropertyValue($propertyJson).trim() === $valueJson",
			"Expected $property on $selector to become $value.",
		);
	}

	/** @When I run this CSS example interaction: */
	public function runInteraction(PyStringNode $script):void {
		$this->getSession()->executeScript((string)$script);
	}

	/** @Then the CSS example should satisfy: */
	public function exampleShouldSatisfy(PyStringNode $expression):void {
		$this->waitForExpression((string)$expression, "CSS example condition failed: " . (string)$expression);
	}

	private function waitForExpression(string $expression, string $message):void {
		if(!$this->getSession()->wait(5000, $expression)) {
			throw new ExpectationException($message, $this->getSession());
		}
	}
}
